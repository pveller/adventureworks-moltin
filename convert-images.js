'use strict';

const fs = require('fs');
const csv = require('csv');
const gm = require('gm');
const Rx = require('rx');
Rx.Node = require('rx-node');

const convert = (path, row) =>
  new Promise((resolve, reject) => {
    row.thumbnail = row.thumbnail.slice(0, -1);
    row.thumbnail_filename = row.thumbnail_filename.slice(0, -1);
    row.large = row.large.slice(0, -1);
    row.large_filename = row.large_filename.slice(0, -1);

    console.log(
      'Processing %s and %s',
      row.thumbnail_filename,
      row.large_filename
    );

    const image_thumb = new Buffer(row.thumbnail, 'hex');
    const thumbnail_filename = row.thumbnail_filename.replace(/\.gif$/, '');
    gm(image_thumb, `${thumbnail_filename}.gif`).write(
      `${path}/images/${thumbnail_filename}.png`,
      err => {
        if (err) {
          console.error(err);
        }
      }
    );

    const image_large = new Buffer(row.large, 'hex');
    const large_filename = row.large_filename.replace(/\.gif$/, '');
    gm(image_large, `${large_filename}.gif`).write(
      `${path}/images/${large_filename}.png`,
      err => {
        if (err) {
          console.error(err);
        }
      }
    );

    resolve();
  });

module.exports = function(path) {
  if (!fs.existsSync(`${path}/images`)) {
    fs.mkdirSync(`${path}/images`);
  }

  return Rx.Node.fromStream(
    fs
      .createReadStream(`${path}/ProductPhoto.csv`, { encoding: 'utf16le' })
      .pipe(
        csv.parse({
          delimiter: '|',
          rowDelimiter: '\r\n',
          columns: [
            'id',
            'thumbnail',
            'thumbnail_filename',
            'large',
            'large_filename',
            'date',
            'ignore'
          ]
        })
      )
  )
    .flatMap(row => Rx.Observable.defer(() => convert(path, row)))
    .toPromise();
};
