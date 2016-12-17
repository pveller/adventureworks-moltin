'use strict';

const Rx = require('rx');
const moltin = require('moltin')({
    publicId: process.env.MOLTIN_PUBLIC_ID,
    secretKey: process.env.MOLTIN_SECRET_KEY
});
const moltin_p = require('./promisify-moltin')(moltin);

module.exports = () => moltin_p.Tax.Create({
    title: 'Default Tax Band',
    rate: 15
}, (tax) => {
    console.log('Successfully created a default tax band');
    return tax;
});
