'use strict';

const _ = require('lodash');
const Moltin = require('../moltin');

module.exports = async function(products) {
  const variationsM = await Moltin.Variations.All();

  // find variations that are missing in Moltin
  const variations = _.chain(products)
    .flatMap(product => product.modifiers.map(mod => mod.title))
    .uniq()
    .filter(mod => !variationsM.data.find(v => v.name === mod))
    .value();

  for (let variation of variations) {
    console.log('Creating a product variation %s', variation);

    let variationM = await Moltin.Variations.Create({
      type: 'product-variation',
      name: variation
    });

    const Options = Moltin.Variations.Options(variationM.data.id);

    // now need to create options for this variation
    const options = _.chain(products)
      .flatMap(product => product.modifiers)
      .filter(mod => mod.title === variation)
      .flatMap(mod => mod.values)
      .uniq()
      .value();

    for (let option of options) {
      console.log('Create a variation option %s -> %s', variation, option);

      // Moltin returns an updated variation, not the option itself
      // One can't query (GET) an option directly, only via the parent variation
      variationM = await Options.Create({
        type: 'product-variation-option',
        name: option,
        description: option
      });

      const optionM = variationM.data.options.find(
        item => item.name === option
      );

      // now need to create SKU and slug modifiers
      console.log('Create modifiers for %s - %s', variation, option);

      const Modifiers = Options.Modifiers(optionM.id);

      await Modifiers.Create({
        type: 'product-modifier',
        modifier_type: 'sku_append',
        value: `_${option}`
      });
      await Modifiers.Create({
        type: 'product-modifier',
        modifier_type: 'slug_append',
        value: `_${option}`
      });
      await Modifiers.Create({
        type: 'product-modifier',
        modifier_type: 'name_append',
        value: ` (${option})`
      });
    }
  }

  // re-read variations
  return await Moltin.Variations.All();
};
