'use strict';

const _ = require('lodash');
const moltin = require('moltin')({
    publicId: process.env.MOLTIN_PUBLIC_ID,
    secretKey: process.env.MOLTIN_SECRET_KEY
});
const moltin_p = require('./promisify-moltin')(moltin);
const advw = require('./adventure-works-data')

// ToDo: 1. convert to a module that exposes one function accepting path and tax band as an argument (or maybe we just query the tax band?)

const findMatchingVariant = function (variation, variants) {
    return variants.find(variant => {
        return Object.keys(variation.modifiers).every(key => {
            let mod = variation.modifiers[key];
            return variant[mod.data.title] === mod.var_title;
        });
    });
};

module.exports = function (tax, path) {
    return Promise.all([
        advw({ path }),
        moltin_p.Category.Tree(null)
    ]).then(([data, categories]) => {
        // Up to 10 products in parallel not to upset Moltin API Gods :)
        return _.chunk(data.inventory
            .filter(product => product.variants.length > 0), 10)
            .reduce((train, chunk) => {
                return train.then(() => {
                    console.log('*** Starting the next chunk of 10 ***');

                    return Promise.all(chunk.map(product => {
                        // Select the first variant to get some variant-level properties that Moltin requires at the product level
                        const variant = product.variants[0];

                        // Adventure Works products have variants that all belong to the same category
                        const category = categories
                            .concat(_.flatMap(categories, c => c.children || []))
                            .find(c => c.title === (variant.category ? variant.category.name : 'Uncategorized'));

                        if (!category) {
                            console.error(`Can't find a category in motlin for [${variant.category.name}]`);
                            // Keep going and let it create other products
                            return Promise.resolve();
                        }

                        console.log('Creating product [%s]', product.name);
                        return moltin_p.Product.Create({
                            title: product.name,
                            slug: product.name.toLowerCase().replace(' ', '-'),
                            status: 1,
                            price: Number(variant.price),
                            sku: `P*${variant.sku.substring(0, 7)}`,
                            stock_status: 1,
                            stock_level: 1000,
                            catalog_only: 0,
                            requires_shipping: 0,
                            description: product.description,
                            tax_band: tax.id,
                            category: category.id
                        }, (result) => {
                            product.moltinId = result.id;
                            return result;
                        }).then(p => {
                            return Promise.all(product.modifiers.map(mod => {
                                console.log('Creating modifier [%s] for [%s]', mod.title, product.name);

                                return moltin_p.Modifier.Create(p.id, {
                                    title: mod.title,
                                    type: 'variant',
                                    instructions: `Please select a ${mod.title}`
                                }, (result) => ({
                                    id: result.id,
                                    productId: p.id,
                                    productName: p.title,
                                    title: mod.title,
                                    values: mod.values
                                }));
                            }));
                        }).then(mods => {
                            return mods.reduce((chain, mod) => {
                                return mod.values.reduce((chain, value) => {
                                    return chain.then(() => {
                                        console.log('Adding a variation [%s - %s] for %s', mod.title, value, mod.productName);

                                        return moltin_p.Variation.Create(mod.productId, mod.id, { title: value });
                                    });
                                }, chain);
                            }, Promise.resolve());
                        }).then(() => {
                            // Read the variants matrix that Moltin has created behind the scenes
                            return moltin_p.Product.Variations(product.moltinId);
                        }).then(variations => {
                            // Prune variations and also update sku numbers on those that match up
                            // We need the right SKU numbers for the recommendation engine to recognize it
                            return Promise.all(variations.map(variation => {
                                let variant = findMatchingVariant(variation, product.variants);

                                if (variant) {
                                    console.log('Changing SKU on the variation %s from %s to %s', variation.title, variation.sku, variant.sku);
                                    return moltin_p.Product.Update(variation.id, { sku: variant.sku });
                                } else {
                                    console.log('Deleting a variation [%s] that does not exist in the data', variation.title);
                                    return moltin_p.Product.Delete(variation.id, (result) => null);
                                }
                            }));
                        }).then(variations => {
                            const images = variations.filter(v => !!v).map(variation => {
                                let variant = findMatchingVariant(variation, product.variants);

                                return {
                                    file: `${path}/images/${variant.image.large_filename.replace(/\.gif$/, '.png')}`,
                                    assignTo: variation.id
                                };
                            });

                            return Promise.all(images
                                .map(image => moltin_p.Image.Create(image))
                                .concat(moltin_p.Image.Create({
                                    // There's no product level image in Adventure Works so any first variant will do
                                    file: `${path}/images/${product.variants[0].image.large_filename.replace(/\.gif$/, '.png')}`,
                                    assignTo: product.moltinId
                                }))).catch((error) => console.error(error));
                        });
                    }));
                });
            }, Promise.resolve());
    }).then((images) => {
        console.log('Products import complete');
    })
};
