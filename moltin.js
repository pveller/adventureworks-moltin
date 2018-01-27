'use strict';

const fs = require('fs');
const MoltinGateway = require('@moltin/sdk').gateway;
const Moltin = MoltinGateway({
  client_id: process.env.MOLTIN_CLIENT_ID,
  client_secret: process.env.MOLTIN_CLIENT_SECRET
});

/*
  Exposing the authenticate-if-needed logic
*/
const authenticate = async storage => {
  const expired =
    !storage.get('mtoken') || Date.now().toString() >= storage.get('mexpires');

  return expired ? await Moltin.Authenticate() : undefined;
};

/*
Augmenting JS SDK with the CreateRelationships function for categories.

The buildRelationshipData is not publicly exposed through the API 
so we will expect resources to be of the following shape:
  [{ type: 'type', id: 'id'}]

We also expect the type to be already pluralized (e.g. categories vs. category).

We also need this "raw" version on Products to create variation relations.
The resource is called /variations and the type is product-variation.
The buildRelationshipData helper cannot handle it.
*/

const relate = function(id, type, resources) {
  return this.request.send(
    `${this.endpoint}/${id}/relationships/${type}`,
    'POST',
    resources
  );
};

Moltin.Categories.CreateRelationships = relate;
Moltin.Products.CreateRelationshipsRaw = relate;

/*
Recursively delete all records to clean up the catalog
*/
const removeAll = function() {
  const clean = async () => {
    const { data, meta } = await this.All();

    const total = meta && meta.results ? meta.results.all : data.length;
    const current = meta && meta.results ? meta.results.total : data.length;

    console.log('Processing the first %s of %s total', current, total);

    for (let item of data) {
      console.log('Requesting a delete of %s - %s', item.name, item.id);
      try {
        await this.Delete(item.id);
      } catch (error) {
        console.error(error);
      }
    }

    return total > current ? await clean() : undefined;
  };

  return clean();
};

Moltin.Categories.RemoveAll = removeAll;
Moltin.Products.RemoveAll = removeAll;

/*
Adding missing API wrappers. Reusing the existing protypes and instance variables.
*/
Moltin.Variations = Object.setPrototypeOf(
  Object.assign({}, Moltin.Products),
  Moltin.Products
);
Moltin.Variations.endpoint = 'variations';

Moltin.Files = Object.setPrototypeOf(
  Object.assign({}, Moltin.Products),
  Moltin.Products
);
Moltin.Files.endpoint = 'files';
// Need to overwrite to stream binary files
// The JS SDK can only send JSON payload
Moltin.Files.Create = async function(file) {
  const { config, storage } = this;

  await authenticate(storage);

  const url = `${config.protocol}://${config.host}/${config.version}`;
  const headers = {
    Authorization: `Bearer: ${storage.get('mtoken')}`,
    'Content-Type': 'multipart/form-data',
    'X-MOLTIN-SDK-LANGUAGE': config.sdk.language,
    'X-MOLTIN-SDK-VERSION': config.sdk.version
  };

  const body = new FormData();
  body.append('public', '1');
  body.append('file', fs.createReadStream(file));

  const response = await fetch(`${url}/${this.endpoint}`, {
    method: 'POST',
    headers,
    body
  });

  console.log(respose);
};

/*
Varitions options and options modifiers require parent's context.
*/
Moltin.Variations.Options = function(variationId) {
  const options = Object.setPrototypeOf(Object.assign({}, this), this);
  options.endpoint = `variations/${variationId}/variation-options`;

  options.Modifiers = function(optionId) {
    const modifiers = Object.setPrototypeOf(Object.assign({}, this), this);
    modifiers.endpoint = `variations/${variationId}/variation-options/${optionId}/product-modifiers`;

    return modifiers;
  };

  return options;
};

Moltin.Products.Build = function(id) {
  return this.request.send(`${this.endpoint}/${id}/build`, 'POST');
};

module.exports = Moltin;
