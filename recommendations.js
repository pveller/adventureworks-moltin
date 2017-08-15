/*
    Generate data required to seed Azure Recommendations API - https://azure.microsoft.com/en-us/services/cognitive-services/recommendations/

    Run with the path to the Adventure Works catalog files as the command line argument:

    $ node recommendations.js "/Users/pavel_veller/Downloads/Adventure Works 2014 OLTP Script"

    IMPORTANT: This scripts doesn't do the pre-processing step that app.js does to clean up the raw Adventure Works data.
    Make sure that you run app.js first to populate your Moltin store. Then proceed with recommendations.

    Will output two files back into the same folder:
    - recommendations-catalog.csv with full product catalog
    - recommendations-usage.csv is the list of historical purchases

    The output would look like this:

    Read 37 objects from /Users/pavel_veller/Downloads/Adventure Works 2014 OLTP Script/ProductSubcategory.csv file
    Read 128 objects from /Users/pavel_veller/Downloads/Adventure Works 2014 OLTP Script/ProductModel.2.csv file
    Read 762 objects from /Users/pavel_veller/Downloads/Adventure Works 2014 OLTP Script/ProductModelProductDescriptionCulture.csv file
    Read 504 objects from /Users/pavel_veller/Downloads/Adventure Works 2014 OLTP Script/ProductProductPhoto.csv file
    Read 504 objects from /Users/pavel_veller/Downloads/Adventure Works 2014 OLTP Script/Product.csv file
    Read 762 objects from /Users/pavel_veller/Downloads/Adventure Works 2014 OLTP Script/ProductDescription.2.csv file
    Read 31465 objects from /Users/pavel_veller/Downloads/Adventure Works 2014 OLTP Script/SalesOrderHeader.csv file
    Read 101 objects from /Users/pavel_veller/Downloads/Adventure Works 2014 OLTP Script/ProductPhoto.csv file
    Read 121317 objects from /Users/pavel_veller/Downloads/Adventure Works 2014 OLTP Script/SalesOrderDetail.csv file
    Generating the catalog file...
    Generating the usage file...
    All said and done
*/
const fs = require('fs');

const path = process.argv[2];
if (!path || !fs.existsSync(path)) {
    throw 'Please specify a valid file system path to the Adventure Works catalog files as a command line argument'
}

const no_comma = (str) => str.replace(/,/g,' ').replace(/\s+/g, ' ');
const format_date = (date) => date.replace(' ', 'T');

const advw = require('./adventure-works-data')({ path });
advw.then(data => {
    return new Promise((resolve, reject) => {
        console.log('Generating the catalog file...');

        fs.writeFile(`${path}/recommendations-catalog.csv`,
            data.inventory.reduce((str, row) => {
                //id, name, category, description
                return row.variants.reduce((str, line) => {
                    return str + `${line.sku},`
                               + `${no_comma(line.name)},`
                               + `${no_comma(line.category.name)},`
                               + `${no_comma(row.description)}\r\n`;
                }, str)
            }, ''),
            function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
    });
}).then(data => {
    return new Promise((resolve, reject) => {
        console.log('Generating the usage file...');

        fs.writeFile(`${path}/recommendations-usage.csv`,
            data.transactions.reduce((str, row) => {
                return row.details.reduce((str, line) => {
                    return str + `${row.customer},`
                               + `${line.sku},`
                               + `${format_date(row.orderDate)},`
                               + 'Purchase\r\n';
                }, str);
            }, ''),
            function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
    });
}).then((data) => {
    console.log('All said and done');

}).catch(error => {
    console.error(error);

    throw error;
});
