const fs = require('fs');
const csv = require('csv');
const _ = require('lodash');

const utf16Multiline = {
  encoding: 'utf16le',
  strip: true,
  delimiter: '|',
  rowDelimiter: '\r\n'
};

const readCsvToArray = function(file, columns, opts) {
  const options = _.assign(
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

module.exports = function(args) {
  const path = args.path || '.';

  return Promise.all([
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
  ]).then(data => {
    const categories = data[0];
    const products = data[1];
    const descriptions = data[2];
    const descriptions_link = data[3];
    const images = data[4];
    const images_link = data[5];
    const variants = data[6];
    const order_header = data[7];
    const order_detail = data[8];

    // Attach images to variants and resolve units and categories
    variants.forEach(v => {
      // There's only one image per variant in the Adventure Works database
      v.image = images_link
        .filter(l => l.product === v.id)
        .map(l => images.find(i => i.id === l.image))[0];

      v.category = categories.find(c => c.id === v.subcategory);
    });

    // Attach product descriptions, variants, and resolve modifiers
    const no_description = 'Description not available';
    products.forEach(p => {
      p.description = descriptions_link
        .filter(l => l.model === p.id && l.culture.trim() === 'en')
        .map(
          l =>
            descriptions.find(d => d.id === l.description) || {
              description: no_description
            }
        )
        .map(d => d.description)
        .concat(no_description)[0];

      p.variants = variants.filter(v => v.model === p.id && !!v.category);

      p.modifiers = ['color', 'size']
        .map(mod => ({
          title: mod,
          values: Object.keys(_.groupBy(p.variants, v => v[mod]) || {})
        }))
        .filter(mod => mod.values.length > 0 && mod.values.every(v => !!v));
    });

    // Attach orders to SKUs
    order_detail.forEach(line => {
      line.sku = variants.find(v => v.id === line.productId).sku;
    });

    // Attach order line items to the order headers
    const grouped_details = _.groupBy(order_detail, od => od.orderId);
    order_header.forEach(oh => {
      oh.details = grouped_details[oh.orderId];
    });

    return {
      inventory: products,
      categories,
      transactions: order_header
    };
  });
};
