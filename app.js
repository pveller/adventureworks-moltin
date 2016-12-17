'use strict';

const fs = require('fs');
const categories = require('./categories');
const products = require('./products');
const images = require('./images');
const tax = require('./tax');
const preprocess = require('./preprocess');

const catalog = process.argv[2];
if (!catalog || !fs.existsSync(catalog)) {
    throw 'Please specify a valid file system path to the Adventure Works catalog files as a command line argument'
}

const monitor = (section, resolve) => () => {
    console.log(`Processing of ${section} is complete`);
    resolve.call();
}

new Promise((resolve, reject) => {
    // Step 1. Pre-process Adventure Works images (save GIFs to PNG)
    images(catalog).subscribeOnCompleted(monitor('images', resolve));
}).then(() => {
    // Step 2. Preprocess ProductModel.csv so that csv parser could understand it
    return preprocess(`${catalog}/ProductModel.csv`, { encoding: 'utf16le' }, [
        /<root.+?>[\s\S]+?<\/root>/mg,
        /<p1:ProductDescription.+?>[\s\S]+?<\/p1:ProductDescription>/mg,
        /<\?.+?\?>/g
    ]);
}).then(() => {
    // Step 3. Preprocess ProductDescription.csv so that csv parser could understand it
    return preprocess(`${catalog}/ProductDescription.csv`, { encoding: 'utf16le' }, [ /"/g ]);
}).then(() => new Promise((resolve, reject) => {
    // Step 4. Import categories
    categories(catalog).subscribeOnCompleted(monitor('categories', resolve));
})).then(() => {
    // Step 5. Create tax band
    return tax();
}).then((tax) => {
    // Step 6. Import products
    return products(tax, catalog);
}).then(() => {
    console.log('New moltin catalog is ready to go')
}).catch((error) => {
    console.error(error);
});