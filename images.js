'use strict';

const _ = require('lodash');
const Moltin = require('./moltin');

module.exports = async function(path, products) {
  const imagesM = await Moltin.Files.ReadAll();

  const images = _.chain(products)
    .flatMap(product => product.variants)
    .map(variant => variant.image.large_filename)
    .map(file => file.replace(/\.gif$/, '.png'))
    .uniq()
    .filter(file => !imagesM.some(i => i.file_name.includes(file)))
    .value();

  if (images.length === 0) {
    return imagesM;
  }

  for (let image of images) {
    console.log('Uploading %s', image);

    try {
      const imageM = await Moltin.Files.Create(`${path}/images/${image}`);
    } catch (error) {
      console.error(error);
    }
  }

  return await Moltin.Files.ReadAll();
};
