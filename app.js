'use strict';

const fs = require('fs');
const categories = require('./categories');
const products = require('./products');
const convertImages = require('./convert-images');
const preprocess = require('./preprocess');
const Moltin = require('./moltin');

process.on('unhandledRejection', reason => console.error(reason));

const argv = require('minimist')(process.argv.slice(2));

const catalog = argv._[0];
if (!catalog || !fs.existsSync(catalog)) {
  throw 'Please specify a valid file system path to the Adventure Works catalog files as a command line argument';
}

const isRequested = (arg, value) => {
  if (!value) {
    return argv[arg];
  }

  if (typeof argv[arg] === 'string') {
    return argv[arg] === value;
  }

  if (Array.isArray(argv[arg])) {
    return argv[arg].includes(value);
  }

  return false;
};
const clean = entity => isRequested('clean', entity);
const skip = entity => isRequested('skip', entity);

// ToDo: refactor away from RxJS

const monitor = (section, resolve) => () => {
  console.log(`Processing of ${section} is complete`);
  resolve.call();
};

// ToDo: check if we need to create a currency

(async function() {
  // Step 1. Pre-process Adventure Works images (save GIFs to PNG)c
  await (skip('convert-images')
    ? Promise.resolve()
    : new Promise(resolve =>
        convertImages(catalog).subscribeOnCompleted(monitor('images', resolve))
      ));

  // Step 2. Preprocess ProductModel.csv so that csv parser could understand it
  await preprocess(`${catalog}/ProductModel.csv`, { encoding: 'utf16le' }, [
    /<root.+?>[\s\S]+?<\/root>/gm,
    /<p1:ProductDescription.+?>[\s\S]+?<\/p1:ProductDescription>/gm,
    /<\?.+?\?>/g
  ]);

  // Step 3. Preprocess ProductDescription.csv so that csv parser could understand it
  await preprocess(
    `${catalog}/ProductDescription.csv`,
    { encoding: 'utf16le' },
    [/"/g]
  );

  // Step 4. Erase the catalog if running with the --clean options
  await (clean('products') ? Moltin.Products.RemoveAll() : Promise.resolve());

  await (clean('variations')
    ? Moltin.Variations.RemoveAll()
    : Promise.resolve());

  await (clean('categories')
    ? Moltin.Categories.RemoveAll()
    : Promise.resolve());

  await (clean('files') ? Moltin.Files.RemoveAll() : Promise.resolve());

  // Step 5. Import categories
  await (skip('categories')
    ? Promise.resolve()
    : new Promise(resolve =>
        categories(catalog).subscribeOnCompleted(monitor('categories', resolve))
      ));

  // Step 6. Import products
  await (skip('products') ? Promise.resolve() : products(catalog));

  console.log('New moltin catalog is ready to go');
})();
