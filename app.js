'use strict';

const fs = require('fs');
const categories = require('./categories');
const products = require('./products');
const images = require('./images');
const preprocess = require('./preprocess');
const Moltin = require('./moltin');

process.on('unhandledRejection', reason => console.error(reason));

const catalog = process.argv[2];
if (!catalog || !fs.existsSync(catalog)) {
  throw 'Please specify a valid file system path to the Adventure Works catalog files as a command line argument';
}

const clean = process.argv[3] === '--clean';
if (clean) {
  console.log('Running in a CLEAN mode');
}

const monitor = (section, resolve) => () => {
  console.log(`Processing of ${section} is complete`);
  resolve.call();
};

new Promise((resolve, reject) => {
  // Step 1. Pre-process Adventure Works images (save GIFs to PNG)
  images(catalog).subscribeOnCompleted(monitor('images', resolve));
})
  .then(() => {
    // Step 2. Preprocess ProductModel.csv so that csv parser could understand it
    return preprocess(`${catalog}/ProductModel.csv`, { encoding: 'utf16le' }, [
      /<root.+?>[\s\S]+?<\/root>/gm,
      /<p1:ProductDescription.+?>[\s\S]+?<\/p1:ProductDescription>/gm,
      /<\?.+?\?>/g
    ]);
  })
  .then(() => {
    // Step 3. Preprocess ProductDescription.csv so that csv parser could understand it
    return preprocess(
      `${catalog}/ProductDescription.csv`,
      { encoding: 'utf16le' },
      [/"/g]
    );
  })
  .then(() => {
    // Step 4. Erase the catalog if running with the --clean option
    console.log('Removing all products');
    return clean ? Moltin.Products.RemoveAll() : Promise.resolve();
  })
  .then(() => {
    // Step 4. Erase the catalog if running with the --clean option
    console.log('Removing all categories');
    return clean ? Moltin.Categories.RemoveAll() : Promise.resolve();
  })
  .then(
    () =>
      new Promise((resolve, reject) => {
        // Step 5. Import categories
        categories(catalog).subscribeOnCompleted(
          monitor('categories', resolve)
        );
      })
  )
  .then(() => {
    // Step 6. Import products
    return products(catalog);
  })
  .then(() => {
    console.log('New moltin catalog is ready to go');
  })
  .catch(error => {
    console.error(error);
  });
