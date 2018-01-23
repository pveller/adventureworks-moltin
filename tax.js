'use strict';

const Rx = require('rx');
const MoltinGateway = require('@moltin/sdk').gateway;
const Moltin = MoltinGateway({
  client_id: process.env.MOLTIN_CLIENT_ID,
  client_secret: process.env.MOLTIN_CLIENT_SECRET
});

module.exports = () =>
  Moltin.Tax.Create(
    {
      title: 'Default Tax Band',
      rate: 15
    },
    tax => {
      console.log('Successfully created a default tax band');
      return tax;
    }
  );
