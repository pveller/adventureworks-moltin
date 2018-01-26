'use strict';

const _ = require('lodash');
const advw = require('./adventure-works-data');
const Moltin = require('./moltin');

// ToDo: 1. convert to a module that exposes one function accepting path and tax band as an argument (or maybe we just query the tax band?)

const findMatchingVariant = function(variation, variants) {
  return variants.find(variant => {
    return Object.keys(variation.modifiers).every(key => {
      let mod = variation.modifiers[key];
      return variant[mod.data.title] === mod.var_title;
    });
  });
};

module.exports = async function(path) {
  const [catalog, tree] = await Promise.all([
    advw({ path }),
    Moltin.Categories.Tree()
  ]);

  const categories = tree.data;
  const products = catalog.inventory.filter(
    product => product.variants.length > 0
  );

  // First, let's see if we need to create variations and options
  // There is only color and size so we should not worry about limit and offset

  let variations = await Moltin.Variations.All();
  const modifiers = _.chain(products)
    .flatMap(product => product.modifiers.map(mod => mod.title))
    .uniq()
    .filter(mod => !variations.data.find(v => v.name === mod))
    .value();

  for (let modifier of modifiers) {
    console.log('Creating a product variation %s', modifier);

    const variation = await Moltin.Variations.Create({
      type: 'product-variation',
      name: modifier
    });

    // now need to create options for this variation
    const options = _.chain(products)
      .flatMap(product => product.modifiers)
      .filter(mod => mod.title === modifier)
      .flatMap(mod => mod.values)
      .uniq()
      .value();

    for (let option of options) {
      console.log('Create a variation option %s for %s', option, modifier);

      await Moltin.Variations.Options(variation.data.id).Create({
        type: 'product-variation-option',
        name: option,
        description: option
      });
    }
  }

  // re-read variations
  variations = await Moltin.Variations.All();

  for (let product of products) {
    // Select the first variant to get some variant-level properties that Moltin requires at the product level
    const variant = product.variants[0];

    // Adventure Works products have variants that all belong to the same category
    const category = categories
      .concat(_.flatMap(categories, c => c.children || []))
      .find(c => c.name === variant.category.name);

    if (!category) {
      console.error(
        "Can't find a category in motlin for %s",
        variant.category.name
      );
      // Keep going and let it create other products
      continue;
    }

    try {
      console.log('Creating product [%s]', product.name);

      let result = await Moltin.Products.Create({
        type: 'product',
        name: product.name,
        slug: product.name.toLowerCase().replace(' ', '-'),
        status: 'live',
        price: [
          {
            amount: Number(variant.price),
            currency: 'USD',
            includes_tax: true
          }
        ],
        sku: `P*${variant.sku.substring(0, 7)}`,
        manage_stock: false,
        commodity_type: 'physical',
        description: product.description
      });

      console.log(
        'Assigning product [%s] to category [%s]',
        product.name,
        category.name
      );

      await Moltin.Products.CreateRelationships(
        result.data.id,
        'category',
        category.id
      );

      // find variations that this product has
      const variants = variations.data.filter(item =>
        product.modifiers.map(mod => mod.title).includes(item.name)
      );

      await Moltin.Products.CreateRelationshipsRaw(
        result.data.id,
        'variations',
        variants.map(variant => ({
          id: variant.id,
          type: variant.type
        }))
      );

      // re-read the product
      result = await Moltin.Products.Get(result.data.id);

      /*
  
        .then(mods => {
          return mods.reduce((chain, mod) => {
            return mod.values.reduce((chain, value) => {
              return chain.then(() => {
                console.log(
                  'Adding a variation [%s - %s] for %s',
                  mod.title,
                  value,
                  mod.productName
                );
  
                return Moltin.Variation.Create(mod.productId, mod.id, {
                  title: value
                });
              });
            }, chain);
          }, Promise.resolve());
        })
        .then(() => {
          // Read the variants matrix that Moltin has created behind the scenes
          return Moltin.Products.Variations(product.moltinId);
        })
        .then(variations => {
          // Prune variations and also update sku numbers on those that match up
          // We need the right SKU numbers for the recommendation engine to recognize it
          return Promise.all(
            variations.map(variation => {
              let variant = findMatchingVariant(
                variation,
                product.variants
              );
  
              if (variant) {
                console.log(
                  'Changing SKU on the variation %s from %s to %s',
                  variation.title,
                  variation.sku,
                  variant.sku
                );
                return Moltin.Products.Update(variation.id, {
                  sku: variant.sku
                });
              } else {
                console.log(
                  'Deleting a variation [%s] that does not exist in the data',
                  variation.title
                );
                return Moltin.Products.Delete(
                  variation.id,
                  result => null
                );
              }
            })
          );
        })
        .then(variations => {
          const images = variations.filter(v => !!v).map(variation => {
            let variant = findMatchingVariant(
              variation,
              product.variants
            );
  
            return {
              file: `${path}/images/${variant.image.large_filename.replace(
                /\.gif$/,
                '.png'
              )}`,
              assignTo: variation.id
            };
          });
  
          return Promise.all(
            images.map(image => Moltin.Image.Create(image)).concat(
              Moltin.Image.Create({
                // There's no product level image in Adventure Works so any first variant will do
                file: `${path}/images/${product.variants[0].image.large_filename.replace(
                  /\.gif$/,
                  '.png'
                )}`,
                assignTo: product.moltinId
              })
            )
          ).catch(error => console.error(error));
        });
        */
    } catch (error) {
      console.error(error);
    }
  }

  console.log('Products import complete');
};
