'use strict';

process.on('unhandledRejection', reason => console.error(reason));

const advw = require('./data/adventure-works');
const imports = {
  currencies: require('./imports/currencies'),
  categories: require('./imports/categories'),
  products: require('./imports/products')
};
const argv = require('./argv');
const Moltin = require('./moltin');

(async function() {
  const catalog = await advw(argv.path);

  for (let entity of ['Products', 'Variations', 'Categories', 'Files']) {
    if (argv.clean(entity.toLowerCase())) {
      console.log('Catalog cleanup: removing %s', entity);
      await Moltin[entity].RemoveAll();
    }
  }

  for (let entity of Object.keys(imports)) {
    if (!argv.skip(entity)) {
      console.log('Importing %s', entity);
      await imports[entity](argv.path, catalog);
    }
  }

  console.log('New moltin catalog is ready to go');
})();
