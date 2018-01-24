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
Moltin.Categories.CreateRelationships = function(id, type, resources) {
  return this.request.send(
    `${this.endpoint}/${id}/relationships/${type}`,
    'POST',
    resources
  );
};

Moltin.Categories.RemoveAll = Moltin.Products.RemoveAll = function() {
  const clean = () => {
    this.Limit(10);

    return this.All().then(({ data, meta }) => {
      const total = meta.results.all;
      const current = meta.results.total;

      // meta.page.current
      // meta.page.total

      console.log('Processing the first %s of %s total', current, total);

      const deleted = Promise.all(
        data.map(p => {
          console.log('Requesting a delete of %s - %s', p.name, p.id);

          return this.Delete(p.id).catch(error => {
            console.error(error);
          });
        })
      );

      return total <= current ? deleted : deleted.then(() => clean());
    });
  };

  return clean();
};

module.exports = Moltin;
