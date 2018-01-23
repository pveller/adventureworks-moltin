'use strict';

const fs = require('fs');
const csv = require('csv');
const Rx = require('rx');
Rx.Node = require('rx-node');

const MoltinGateway = require('@moltin/sdk').gateway;
const Moltin = MoltinGateway({
  client_id: process.env.MOLTIN_CLIENT_ID,
  client_secret: process.env.MOLTIN_CLIENT_SECRET
});

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
        Moltin.Categories.Create(
          {
            type: 'category',
            name: row.name,
            slug: row.name.toLowerCase(),
            parent: null,
            status: 1,
            description: row.name
          },
          result => {
            console.log(`Successfully created ${result.title} category`);
            return result;
          }
        ).then(result => {
          row.moltin = result;
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
        Moltin.Categories.Create(
          {
            type: 'category',
            name: subcategory.name,
            slug: subcategory.name.toLowerCase(),
            parent: subcategory.parent.moltin.id,
            status: 1,
            description: subcategory.name
          },
          result => {
            console.log(
              `Successfully created ${subcategory.parent.moltin.title} -> ${
                result.title
              } category`
            );
            return result;
          }
        )
      )
    );
};
