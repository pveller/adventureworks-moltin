const fs = require('fs');
const csv = require('csv');
const _ = require('lodash');
const convertImages = require('./convert-images');
const preprocess = require('./preprocess');
const argv = require('./argv');

const utf16Multiline = {
  encoding: 'utf16le',
  strip: true,
  delimiter: '|',
  rowDelimiter: '\r\n'
};

const readCsvToArray = function(file, columns, opts) {
  const options = Object.assign(
    {
      encoding: 'ascii',
      delimiter: '\t',
      rowDelimiter: '\r\n',
      strip: false
    },
    opts
  );

  return new Promise((resolve, reject) => {
    const result = [];

    fs
      .createReadStream(`${file}`, { encoding: options.encoding })
      .pipe(
        csv.parse({
          delimiter: options.delimiter,
          rowDelimiter: options.rowDelimiter,
          columns: !options.strip ? columns : columns.concat('ignore')
        })
      )
      .on('data', function(row) {
        for (let attr of Object.keys(row).filter(k => !!row[k])) {
          if (options.strip) {
            row[attr] = row[attr].slice(0, -1);
          }
          row[attr] = row[attr].trim();
        }
        result.push(row);
      })
      .on('end', function() {
        console.log('Read %s objects from %s file', result.length, file);
        resolve(result);
      })
      .on('error', function(error) {
        console.log('Error parsing %s', file);
        reject(error);
      });
  });
};

module.exports = async function(path = '.') {
  // Pre-process Adventure Works images (save GIFs to PNG)
  if (!argv.skip('convert-images')) {
    await convertImages(path);
  }

  if (!argv.skip('preprocess-csv')) {
    // Preprocess ProductModel.csv so that csv parser could understand it
    console.log('Patching ProductModel.csv');
    await preprocess(`${path}/ProductModel.csv`, { encoding: 'utf16le' }, [
      /<root.+?>[\s\S]+?<\/root>/gm,
      /<p1:ProductDescription.+?>[\s\S]+?<\/p1:ProductDescription>/gm,
      /<\?.+?\?>/g
    ]);

    // Preprocess ProductDescription.csv so that csv parser could understand it
    console.log('Patching ProductDescription.csv');
    await preprocess(
      `${path}/ProductDescription.csv`,
      { encoding: 'utf16le' },
      [/"/g]
    );
  }

  const [
    categories,
    subCategories,
    products,
    descriptions,
    descriptionLinks,
    images,
    imageLinks,
    variants,
    orderHeaders,
    orderDetails
  ] = await Promise.all([
    readCsvToArray(`${path}/ProductCategory.csv`, [
      'id',
      'name',
      'guid',
      'date'
    ]),
    readCsvToArray(`${path}/ProductSubcategory.csv`, [
      'id',
      'parent',
      'name',
      'guid',
      'date'
    ]),
    readCsvToArray(
      `${path}/ProductModel.2.csv`,
      ['id', 'name', 'description', 'instructions', 'guid', 'modified'],
      utf16Multiline
    ),
    readCsvToArray(
      `${path}/ProductDescription.2.csv`,
      ['id', 'description', 'guid', 'modified'],
      {
        encoding: 'utf16le',
        rowDelimiter: '\n'
      }
    ),
    readCsvToArray(`${path}/ProductModelProductDescriptionCulture.csv`, [
      'model',
      'description',
      'culture',
      'modified'
    ]),
    readCsvToArray(
      `${path}/ProductPhoto.csv`,
      [
        'id',
        'thumbnail',
        'thumbnail_filename',
        'large',
        'large_filename',
        'date'
      ],
      utf16Multiline
    ),
    readCsvToArray(`${path}/ProductProductPhoto.csv`, [
      'product',
      'image',
      'primary',
      'modified'
    ]),
    readCsvToArray(`${path}/Product.csv`, [
      'id',
      'name',
      'sku',
      'make',
      'finished',
      'color',
      'safetyStockLevel',
      'reorderPoint',
      'cost',
      'price',
      'size',
      'sizeUnit',
      'weightUnit',
      'weight',
      'daysToManufacture',
      'productLine',
      'class',
      'style',
      'subcategory',
      'model',
      'sellStartDate',
      'sellEndDate',
      'discontinuedDate',
      'guid',
      'modified'
    ]),
    readCsvToArray(`${path}/SalesOrderHeader.csv`, [
      'orderId',
      'revisionNumber',
      'orderDate',
      'dueDate',
      'shipDate',
      'status',
      'isOnline',
      'onlineNumber',
      'poNumber',
      'accountNumber',
      'customer',
      'salesPerson',
      'territory',
      'billTo',
      'shipTo',
      'shipMethod',
      'cc',
      'ccCode',
      'currency',
      'subTotal',
      'tax',
      'freight',
      'total',
      'comment',
      'guid',
      'date'
    ]),
    readCsvToArray(`${path}/SalesOrderDetail.csv`, [
      'orderId',
      'recordId',
      'tracking',
      'quantity',
      'productId',
      'offerId',
      'price',
      'discount',
      'total',
      'guid',
      'date'
    ])
  ]);

  // Organize categories into a hierarchy
  console.log('Organizing categories into a hierarchy');

  for (let category of categories) {
    category.children = subCategories.filter(
      item => item.parent === category.id
    );
  }

  // Attach images and categories to variants
  console.log('Assigning images and categories to variants');

  for (let variant of variants) {
    // There's only one image per variant in the Adventure Works database
    variant.image = imageLinks
      .filter(link => link.product === variant.id)
      .map(link => images.find(image => image.id === link.image))[0];

    // we are re-saving all images as PNG (see convert-images.js)
    if (variant.image) {
      variant.image.large_filename = variant.image.large_filename.replace(
        /\.gif$/,
        '.png'
      );
    }

    // we will only take products and variants that live under a subcategory
    variant.category = subCategories.find(c => c.id === variant.subcategory);
  }

  // Attach product descriptions, variants, and resolve modifiers
  console.log('Assigning description, variants, and modifiers to products');

  const noDescription = { description: 'Description not available' };
  for (let product of products) {
    const { description } = descriptionLinks
      .filter(link => link.model === product.id && link.culture.trim() === 'en')
      .map(link => descriptions.find(item => item.id === link.description))
      .filter(description => description)
      .concat(noDescription)
      .shift();

    product.description = description;
    product.variants = variants.filter(
      // as noted above, we only take variants and products that live under a subcategory
      variant => variant.model === product.id && !!variant.category
    );

    product.modifiers = ['color', 'size']
      .map(mod => ({
        title: mod,
        values: Object.keys(_.groupBy(product.variants, v => v[mod]) || {})
      }))
      .filter(mod => mod.values.length > 0 && mod.values.every(v => !!v));
  }

  // Attach order line items to the order headers
  console.log('Organizing orders into a hierarchy');

  const groupedByHeader = _.groupBy(orderDetails, detail => detail.orderId);
  for (let header of orderHeaders) {
    header.details = groupedByHeader[header.orderId];
  }

  // Attach orders to SKUs
  console.log('Attaching SKUs to orders');
  for (let line of orderDetails) {
    line.sku = variants.find(variant => variant.id === line.productId).sku;
  }

  return {
    inventory: products,
    categories,
    transactions: orderHeaders
  };
};
