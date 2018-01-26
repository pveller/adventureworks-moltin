'use strict';

const MoltinGateway = require('@moltin/sdk').gateway;
const Moltin = MoltinGateway({
  client_id: process.env.MOLTIN_CLIENT_ID,
  client_secret: process.env.MOLTIN_CLIENT_SECRET
});

/*
Augmenting JS SDK with the CreateRelationships function for categories.

The buildRelationshipData is not publicly exposed through the API 
so we will expect resources to be of the following shape:
  [{ type: 'type', id: 'id'}]

We also expect the type to be already pluralized (e.g. categories vs. category)
*/

Moltin.Categories.CreateRelationships = Moltin.Products.CreateRelationshipsRaw = function(
  id,
  type,
  resources
) {
  return this.request.send(
    `${this.endpoint}/${id}/relationships/${type}`,
    'POST',
    resources
  );
};

Moltin.Categories.RemoveAll = Moltin.Products.RemoveAll = function() {
  const clean = () => {
    return this.All().then(({ data, meta }) => {
      const total = meta && meta.results ? meta.results.all : data.length;
      const current = meta && meta.results ? meta.results.total : data.length;

      // meta.page.current
      // meta.page.total

      console.log('Processing the first %s of %s total', current, total);

      const deleted = data.reduce(
        (chain, p) =>
          chain.then(() => {
            console.log('Requesting a delete of %s - %s', p.name, p.id);

            return this.Delete(p.id).catch(error => {
              console.error(error);
            });
          }),
        Promise.resolve()
      );

      return total <= current ? deleted : deleted.then(() => clean());
    });
  };

  return clean();
};

Moltin.Variations = Object.setPrototypeOf(
  Object.assign({}, Moltin.Products),
  Moltin.Products
);
Moltin.Variations.endpoint = 'variations';
Moltin.Variations.Options = function(variationId) {
  const options = Object.setPrototypeOf(Object.assign({}, this), this);
  options.endpoint = `variations/${variationId}/variation-options`;

  return options;
};

module.exports = Moltin;
