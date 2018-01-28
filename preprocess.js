'use strict';

const fs = require('fs');

module.exports = function(file, opts, patches) {
  return new Promise((resolve, reject) => {
    fs.readFile(`${file}`, opts, (err, content) => {
      if (err) {
        return reject(err);
      }

      const patched = patches.reduce(
        (text, patch) => text.replace(patch, ''),
        content
      );

      fs.writeFile(`${file}`.replace(/csv$/, '2.csv'), patched, opts, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
};
