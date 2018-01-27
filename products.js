'use strict';

const _ = require('lodash');
const advw = require('./adventure-works-data');
const variations = require('./variations');
const images = require('./images');
const Moltin = require('./moltin');

module.exports = async function(path) {
  const [catalog, tree] = await Promise.all([
    advw({ path }),
    Moltin.Categories.Tree()
  ]);

  const categories = tree.data;
  const products = catalog.inventory.filter(product => product.variants.length);

  // First, let's see if we need to create variations and options
  const variationsM = await variations(products);

  // Load all images (if needed)
  const imagesM = await images(path, products);

  for (let product of products) {
    // Select the first variant to get some variant-level properties that Moltin needs at the product level
    for (let attr of ['category', 'sku', 'price']) {
      product[attr] = product.variants[0][attr];
    }

    // Adventure Works products have variants that all belong to the same category
    const category = categories
      .concat(_.flatMap(categories, c => c.children || []))
      .find(c => c.name === product.category.name);

    if (!category) {
      console.error("Can't find a category for %s", product.category.name);
      continue;
    }

    try {
      console.log('Creating product [%s]', product.name);

      let productM = await Moltin.Products.Create({
        type: 'product',
        name: product.name,
        slug: product.name.toLowerCase().replace(' ', '-'),
        status: 'live',
        price: [
          {
            amount: Number(product.price),
            currency: 'USD',
            includes_tax: true
          }
        ],
        sku: `${product.sku.substring(0, 7)}`,
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
        productM.data.id,
        'category',
        category.id
      );

      console.log('Assiging applicable variations to %s', product.name);

      await Moltin.Products.CreateRelationshipsRaw(
        productM.data.id,
        'variations',
        variationsM.data
          .filter(variation =>
            product.modifiers.some(mod => mod.title === variation.name)
          )
          .map(variation => ({
            id: variation.id,
            type: variation.type
          }))
      );

      // build product variants
      /*
      I am not building the variants using the magic build process.
      https://moltin.com/blog/2017/06/introducing-variations-options-modifiers/

      Adventure Works has 18 sizes and 9 colors and that 162 combinations.
      Running a build will create that many products for each parent product.
      Instead, I am creating the variants by hand. 

      The v1 used to have the is_variation attribute that would signal me
      that a product is a variant of another product. v2 doesn't have it 
      so I will tell the difference by inspecting the relations. 
      Variants will not have variation relation and that will be a tell sign.
      
      (I am using this when generating search indexes for the bot)
      */
      // const build = await Moltin.Products.Build(result.data.id);

      // now let's create the variants
      for (let variant of product.variants) {
        console.log(
          'Creating a product variant %s - %s',
          variant.name,
          variant.sku
        );

        const variantM = await Moltin.Products.Create({
          type: 'product',
          name: variant.name,
          slug: variant.name.toLowerCase().replace(' ', '-'),
          status: 'live',
          price: [
            {
              amount: Number(variant.price),
              currency: 'USD',
              includes_tax: true
            }
          ],
          sku: variant.sku,
          manage_stock: false,
          commodity_type: 'physical',
          // this is the only way to rememebr what size and color this variant represents
          // without using flows and without actually building the matrix (see the rationale above)
          description: JSON.stringify({
            size: variant.size,
            color: variant.color
          })
        });
      }

      // now need to import images and create relations for product and its variants

      /*
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
