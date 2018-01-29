'use strict';

/*
    Generate data required to seed Azure Recommendations API - https://azure.microsoft.com/en-us/services/cognitive-services/recommendations/

    Run with the path to the Adventure Works catalog files as the command line argument:

    $ node recommendations.js "/Users/pavel_veller/Downloads/Adventure Works 2014 OLTP Script"

    Will output two files back into the same folder:
    - recommendations-catalog.csv with full product catalog
    - recommendations-usage.csv is the list of historical purchases

    The output would look like this:

    Read 37 objects from /Users/pavel_veller/Downloads/Adventure Works 2014 OLTP Script/ProductSubcategory.csv file
    Read 128 objects from /Users/pavel_veller/Downloads/Adventure Works 2014 OLTP Script/ProductModel.2.csv file
    Read 762 objects from /Users/pavel_veller/Downloads/Adventure Works 2014 OLTP Script/ProductModelProductDescriptionCulture.csv file
    Read 504 objects from /Users/pavel_veller/Downloads/Adventure Works 2014 OLTP Script/ProductProductPhoto.csv file
    Read 504 objects from /Users/pavel_veller/Downloads/Adventure Works 2014 OLTP Script/Product.csv file
    Read 762 objects from /Users/pavel_veller/Downloads/Adventure Works 2014 OLTP Script/ProductDescription.2.csv file
    Read 31465 objects from /Users/pavel_veller/Downloads/Adventure Works 2014 OLTP Script/SalesOrderHeader.csv file
    Read 101 objects from /Users/pavel_veller/Downloads/Adventure Works 2014 OLTP Script/ProductPhoto.csv file
    Read 121317 objects from /Users/pavel_veller/Downloads/Adventure Works 2014 OLTP Script/SalesOrderDetail.csv file
    Generating the catalog file...
    Generating the usage file...
    All said and done
*/
const fs = require('fs');
const argv = require('../argv');
const advw = require('../data/adventure-works');

const noComma = str => str.replace(/,/g, ' ').replace(/\s+/g, ' ');
const formatDate = date => date.replace(' ', 'T');

const rejectOnError = (err, resolve, reject) => {
  if (err) {
    reject(err);
  } else {
    resolve();
  }
};

(async function() {
  const catalog = await advw(argv.path);

  console.log('Generating the catalog file...');
  await new Promise((resolve, reject) => {
    fs.writeFile(
      `${argv.path}/recommendations-catalog.csv`,
      catalog.inventory.reduce((str, row) => {
        //id, name, category, description
        return row.variants.reduce((str, line) => {
          return (
            str +
            `${line.sku},` +
            `${noComma(line.name)},` +
            `${noComma(line.category.name)},` +
            `${noComma(row.description)}\r\n`
          );
        }, str);
      }, ''),
      err => rejectOnError(err, resolve, reject)
    );
  });

  console.log('Generating the usage file...');
  await new Promise((resolve, reject) => {
    fs.writeFile(
      `${argv.path}/recommendations-usage.csv`,
      catalog.transactions.reduce((str, row) => {
        return row.details.reduce((str, line) => {
          return (
            str +
            `${row.customer},` +
            `${line.sku},` +
            `${formatDate(row.orderDate)},` +
            'Purchase\r\n'
          );
        }, str);
      }, ''),
      err => rejectOnError(err, resolve, reject)
    );
  });

  console.log('All said and done');
})();
