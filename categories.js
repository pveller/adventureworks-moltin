'use strict';

const Moltin = require('./moltin');
const fs = require('fs');
const csv = require('csv');
const Rx = require('rx');
Rx.Node = require('rx-node');

module.exports = function(path) {
  return Rx.Node.fromStream(
    fs.createReadStream(`${path}/ProductCategory.csv`).pipe(
      csv.parse({
        delimiter: '\t',
        rowDelimiter: '\r\n',
        columns: ['id', 'name', 'guid', 'date']
      })
    )
  )
    .concatMap(row =>
      Rx.Observable.defer(() =>
        Moltin.Categories.Create({
          type: 'category',
          name: row.name,
          slug: row.name.toLowerCase(),
          status: 'live',
          description: row.name
        }).then(({ data }) => {
          console.log(`Successfully created ${data.name} category`);

          row.moltin = data;
          return row;
        })
      )
    )
    .flatMap(category =>
      Rx.Node.fromStream(
        fs.createReadStream(`${path}/ProductSubcategory.csv`).pipe(
          csv.parse({
            delimiter: '\t',
            rowDelimiter: '\r\n',
            columns: ['id', 'parent', 'name', 'guid', 'date']
          })
        )
      )
        .filter(row => row.parent === category.id)
        .map(subcategory => {
          subcategory.parent = category;
          return subcategory;
        })
    )
    .concatMap(subcategory =>
      Rx.Observable.defer(() =>
        Moltin.Categories.Create({
          type: 'category',
          name: subcategory.name,
          slug: subcategory.name.toLowerCase(),
          status: 'live',
          description: subcategory.name
        }).then(({ data }) => {
          console.log(`Successfully created ${data.name} category`);

          subcategory.moltin = data;
          return subcategory;
        })
      )
    )
    .reduce((acc, subcategory) => {
      const parent = subcategory.parent.moltin.id;

      acc[parent] = acc[parent] || [];
      acc[parent].push(subcategory.moltin.id);

      return acc;
    }, {})
    .concatMap(subcategories =>
      Rx.Observable.defer(() =>
        Object.keys(subcategories).reduce(
          (chain, parent) =>
            chain.then(() =>
              Moltin.Categories.CreateRelationships(
                parent,
                'children',
                subcategories[parent].map(child => ({
                  type: 'category',
                  id: child
                }))
              )
                .then(result => {
                  console.log(
                    'Created %s children relationships for %s',
                    subcategories[parent].length,
                    parent
                  );
                })
                .catch(error => {
                  console.error(error);
                })
            ),
          Promise.resolve()
        )
      )
    );
};
