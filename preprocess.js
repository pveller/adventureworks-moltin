'use strict';

const fs = require('fs');

module.exports = function(file, opts, patches) {
  return new Promise((resolve, reject) => {
    fs.readFile(`${file}`, opts, (err, content) => {
      if (err) {
        return reject(err);
      }

      const modified = patches.reduce((text, patch) => {
        return text.replace(patch, '');
      }, content);

      fs.writeFile(`${file}`.replace(/csv$/, '2.csv'), modified, opts, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
};
