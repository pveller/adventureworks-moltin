'use strict';

process.on('unhandledRejection', reason => console.error(reason));

const advw = require('./adventure-works-data');
const categories = require('./categories');
const products = require('./products');
const argv = require('./argv');
const Moltin = require('./moltin');

// ToDo: check if we need to create a currency

(async function() {
  const catalog = await advw(argv.path);

  if (argv.clean('products')) {
    console.log('Catalog cleanup: removing products');
    await Moltin.Products.RemoveAll();
  }

  if (argv.clean('variations')) {
    console.log('Catalog cleanup: removing variations');
    await Moltin.Variations.RemoveAll();
  }

  if (argv.clean('categories')) {
    console.log('Catalog cleanup: removing categories');
    await Moltin.Categories.RemoveAll();
  }

  if (argv.clean('files')) {
    console.log('Catalog cleanup: removing files and images');
    await Moltin.Files.RemoveAll();
  }

  if (!argv.skip('categories')) {
    console.log('Importing categories');
    await categories(argv.path, catalog);
  }

  if (!argv.skip('products')) {
    console.log('Importing products');
    await products(argv.path, catalog);
  }

  console.log('New moltin catalog is ready to go');
})();
