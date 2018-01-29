'use strict';

const _ = require('lodash');
const Moltin = require('../moltin');

module.exports = async function(path, catalog) {
  const currencies = (await Moltin.Currencies.All()).data;

  if (!currencies.find(currency => currency.code === 'USD')) {
    await Moltin.Currencies.Create({
      type: 'currency',
      code: 'USD',
      format: '${price}',
      exchange_rate: 1,
      decimal_point: '.',
      thousand_separator: ',',
      decimal_places: 2,
      default: true,
      enabled: true
    });
  }
};
