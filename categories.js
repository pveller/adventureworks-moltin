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
        })
          .then(({ data }) => {
            console.log(`Successfully created ${data.name} category`);
            return data;
          })
          .then(result => {
            return Moltin.Categories.CreateRelationships(
              result.id,
              'categories',
              [
                {
                  type: 'category',
                  id: subcategory.parent.moltin.id
                }
              ]
            );
          })
          .then(result => {
            console.log(
              'Registered %s -> %s relationship',
              subcategory.parent.moltin.name,
              subcategory.name
            );
          })
          .catch(error => {
            console.error(error);
          })
      )
    );
};
