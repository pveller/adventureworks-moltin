'use strict';

const _ = require('lodash');
const advw = require('./adventure-works-data');
const Moltin = require('./moltin');

// ToDo: 1. convert to a module that exposes one function accepting path and tax band as an argument (or maybe we just query the tax band?)

const findMatchingVariant = function(variation, variants) {
  return variants.find(variant => {
    return Object.keys(variation.modifiers).every(key => {
      let mod = variation.modifiers[key];
      return variant[mod.data.title] === mod.var_title;
    });
  });
};

module.exports = function(tax, path) {
  return Promise.all([advw({ path }), Moltin.Categories.Tree()])
    .then(([data, categories]) => {
      // Up to 10 products in parallel not to upset Moltin API Gods :)
      return _.chunk(
        data.inventory.filter(product => product.variants.length > 0),
        10
      ).reduce((train, chunk) => {
        return train.then(() => {
          console.log('*** Starting the next chunk of 10 ***');

          return Promise.all(
            chunk.map(product => {
              // Select the first variant to get some variant-level properties that Moltin requires at the product level
              const variant = product.variants[0];

              // Adventure Works products have variants that all belong to the same category
              const category = categories
                .concat(_.flatMap(categories, c => c.children || []))
                .find(
                  c =>
                    c.title ===
                    (variant.category ? variant.category.name : 'Uncategorized')
                );

              if (!category) {
                console.error(
                  `Can't find a category in motlin for [${
                    variant.category.name
                  }]`
                );
                // Keep going and let it create other products
                return Promise.resolve();
              }

              console.log('Creating product [%s]', product.name);
              return Moltin.Products.Create(
                {
                  type: 'product',
                  name: product.name,
                  slug: product.name.toLowerCase().replace(' ', '-'),
                  status: 'live',
                  price: [
                    {
                      amount: Number(variant.price),
                      currency: 'USD',
                      includes_tax: true
                    }
                  ],
                  sku: `P*${variant.sku.substring(0, 7)}`,
                  manage_stock: false,
                  commodity_type: 'physical',
                  description: product.description,
                  relationships: {
                    categories: {
                      data: [
                        {
                          type: 'category',
                          id: category.id
                        }
                      ]
                    }
                  }
                },
                result => {
                  product.moltinId = result.id;
                  return result;
                }
              )
                .then(p => {
                  return Promise.all(
                    product.modifiers.map(mod => {
                      console.log(
                        'Creating modifier [%s] for [%s]',
                        mod.title,
                        product.name
                      );

                      return Moltin.Modifier.Create(
                        p.id,
                        {
                          title: mod.title,
                          type: 'variant',
                          instructions: `Please select a ${mod.title}`
                        },
                        result => ({
                          id: result.id,
                          productId: p.id,
                          productName: p.title,
                          title: mod.title,
                          values: mod.values
                        })
                      );
                    })
                  );
                })
                .then(mods => {
                  return mods.reduce((chain, mod) => {
                    return mod.values.reduce((chain, value) => {
                      return chain.then(() => {
                        console.log(
                          'Adding a variation [%s - %s] for %s',
                          mod.title,
                          value,
                          mod.productName
                        );

                        return Moltin.Variation.Create(mod.productId, mod.id, {
                          title: value
                        });
                      });
                    }, chain);
                  }, Promise.resolve());
                })
                .then(() => {
                  // Read the variants matrix that Moltin has created behind the scenes
                  return Moltin.Products.Variations(product.moltinId);
                })
                .then(variations => {
                  // Prune variations and also update sku numbers on those that match up
                  // We need the right SKU numbers for the recommendation engine to recognize it
                  return Promise.all(
                    variations.map(variation => {
                      let variant = findMatchingVariant(
                        variation,
                        product.variants
                      );

                      if (variant) {
                        console.log(
                          'Changing SKU on the variation %s from %s to %s',
                          variation.title,
                          variation.sku,
                          variant.sku
                        );
                        return Moltin.Products.Update(variation.id, {
                          sku: variant.sku
                        });
                      } else {
                        console.log(
                          'Deleting a variation [%s] that does not exist in the data',
                          variation.title
                        );
                        return Moltin.Products.Delete(
                          variation.id,
                          result => null
                        );
                      }
                    })
                  );
                })
                .then(variations => {
                  const images = variations.filter(v => !!v).map(variation => {
                    let variant = findMatchingVariant(
                      variation,
                      product.variants
                    );

                    return {
                      file: `${path}/images/${variant.image.large_filename.replace(
                        /\.gif$/,
                        '.png'
                      )}`,
                      assignTo: variation.id
                    };
                  });

                  return Promise.all(
                    images.map(image => Moltin.Image.Create(image)).concat(
                      Moltin.Image.Create({
                        // There's no product level image in Adventure Works so any first variant will do
                        file: `${path}/images/${product.variants[0].image.large_filename.replace(
                          /\.gif$/,
                          '.png'
                        )}`,
                        assignTo: product.moltinId
                      })
                    )
                  ).catch(error => console.error(error));
                });
            })
          );
        });
      }, Promise.resolve());
    })
    .then(images => {
      console.log('Products import complete');
    });
};
