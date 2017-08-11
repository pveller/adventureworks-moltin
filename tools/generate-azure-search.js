'use strict';

const fs = require('fs');
const _ = require('lodash');
const co = require('co');
const moltin = require('moltin')({
    publicId: process.env.MOLTIN_PUBLIC_ID,
    secretKey: process.env.MOLTIN_SECRET_KEY
});
const moltin_p = require('../promisify-moltin')(moltin);

const catalog = process.argv[2];
if (!catalog || !fs.existsSync(catalog)) {
    throw 'Please specify a valid file system path to the Adventure Works catalog files as a command line argument'
}

const categories = moltin_p.Category.Tree(null); 
const products = co(function* () {
    const list = (offset, limit) => {
        console.log('Fetching products from %s to %s', offset + 1, offset + limit);
        return moltin_p.Product.List({offset: offset, limit: limit})
    };
    
    const all = [];
    let current = 0, limit = 100, total = 100;
    while (total > current) {
        let batch = yield list(current, Math.min(limit, total - current));

        total = batch.pagination.total;
        current = batch.pagination.to;

        all.push(...batch);
    }

    return all;
});

Promise.all([categories, products]).then((data) => {
    const categories = data[0];
    const products = data[1];

    const categoryIndex = categories
        .concat(_.flatMap(categories, c => c.children || []))
        .map(c => ({
            '@search.action': 'upload',
            'id': c.id,
            'title': c.title,
            'description': c.description,
            'parent': c.parent ? c.parent.data.id : null
        }));

    const productIndex = products.filter(p => !p.is_variation).map(p => {
        const categoryKey = Object.keys(p.category.data)[0];
        const category = p.category.data[categoryKey];

        const modifierKeys = Object.keys(p.modifiers);
        const modifiers = modifierKeys.map(key => p.modifiers[key].title);

        const [color, size] = ['color', 'size'].map(variance => {
            return _.chain(modifierKeys)
                .map(key => p.modifiers[key])
                .filter(mod => mod.title === variance)
                .flatMap(mod => Object.keys(mod.variations).map(id => mod.variations[id]))
                .map(variation => variation.title)
                .value();
        });

        const image = {
            domain: p.images[0] ? p.images[0].segments.domain : null,
            suffix: p.images[0] ? p.images[0].segments.suffix : null
        };

        return {
            '@search.action': 'upload',
            'id': p.id,
            'title': p.title,
            'description': p.description,
            'category': category.parent.data.title,
            'categoryId': category.parent.data.id,
            'subcategory': category.title,
            'subcategoryId': category.id,
            'modifiers': modifiers,
            'color': color || null,
            'size': size || null,
            'price': Number(p.price.value.substring(1).replace(',','')),
            'image_domain': image.domain,
            'image_suffix': image.suffix
        };
    });

    const variantIndex = products.filter(p => p.is_variation || Object.keys(p.modifiers).length === 0).map(p => {
        const modifierKeys = Object.keys(p.modifiers);
        const [color, size] = ['color', 'size'].map(variance => {
            let key = modifierKeys.find(key => p.modifiers[key].data.title === variance);
            return key ? p.modifiers[key].var_title : null; 
        });

        const image = {
            domain: p.images[0] ? p.images[0].segments.domain : null,
            suffix: p.images[0] ? p.images[0].segments.suffix : null
        };

        return {
            '@search.action': 'upload',
            'id': p.id,
            'productId': modifierKeys.length ? p.modifiers[modifierKeys[0]].data.product : p.id,
            'color': color,
            'size': size,
            'sku': p.sku.replace(/^P\*/, ''),
            'price': Number(p.price.value.substring(1).replace(',','')),
            'image_domain': image.domain,
            'image_suffix': image.suffix
        };
    });

    return Promise.resolve({
        categories: categoryIndex,
        products: productIndex,
        variants: variantIndex
    });
}).then((index) => {
    return Promise.all(Object.keys(index).map(file => {
        return new Promise((resolve, reject) => {
            console.log('Writing index [%s.json] out to disk', file);

            fs.writeFile(`./${file}.json`, JSON.stringify({
                value: index[file]
            }), (err) => {
                if (err) {
                    console.error(err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }));
}).then(() => {
    console.log('All said and done');
}).catch((error) => {
    console.log(error);
});
