# UPDATE

Upgraded to work over Moltin v2 and is now using the latest [js-sdk](https://github.com/moltin/js-sdk)

# Adventure Works catalog for Moltin

A set of scripts to setup the [Adventure Works](https://github.com/Microsoft/sql-server-samples/releases/tag/adventureworks) product catalog in your [Moltin](https://moltin.com/) store.

## Motivation

I was building a conversational eCommerce chatbot for [my talk at API Strat](http://boston2016.apistrat.com/speakers/pavel-veller) and I needed a robust but easy to use API-first commerce platform with a decent free plan. This is how I discovered [Moltin](https://moltin.com/).

The next thing I needed was a sample store that would have categories and products with images and variants (like `color` and `size`). I also needed historical orders to build a recommendation model with [Cognitive Services Recommendations API](https://www.microsoft.com/cognitive-services/en-us/recommendations-api). This is how I discovered [Adventure Works](https://github.com/Microsoft/sql-server-samples/releases/tag/adventureworks).

## Usage

To create your Adventure Works catalog in Moltin you'll need [node.js](https://nodejs.org/en/) (go for the latest 8.x as I am using ES6/7 straight up with no build step). Then:

* Sign up for Moltin and create a new store. Go to the store settings to get your API keys.

* Set up two environment variables

```
export MOLTIN_CLIENT_ID="<Client ID>"
export MOLTIN_CLIENT_SECRET="<Client Secret>"
```

* Download Adventure Works OLTP Script from [here](https://github.com/Microsoft/sql-server-samples/releases/download/adventureworks/AdventureWorks-oltp-install-script.zip) and unzip (for example to `~/Downloads/Adventure Works 2014 OLTP Script`)

* Clone this repository

```
git clone git@github.com:pveller/adventureworks-moltin.git
```

* Install [ImageMagick](http://www.imagemagick.org/) and [GraphicsMagic](http://www.graphicsmagick.org/). I am using [gm](https://www.npmjs.com/package/gm) to pre-process images and it needs these two. On Mac, it is as simple as:

```
brew install imagemagick
brew install graphicsmagick
```

* Install packages

```
npm install
```

* Run `app.js` and supply the path to your Adventure Works files as a command line argument

```
node app.js "/Users/<yourself>/Downloads/Adventure Works 2014 OLTP Script"
```

If you haven't set up your Moltin store's credentials as global environment variables, you can run `app.js` like this:

```
$ MOLTIN_CLIENT_ID="<Client ID>" MOLTIN_CLIENT_SECRET="<Client Secret>" node app.js "<path to catalog>"
```

If you are re-running the script, you can selectively skip certain steps or require that a script first cleans up your store:

```
node app.js "path" --clean=<entity> --clean=<another entity> --skip=<step> --skip=<another step>
```

You can clean: `products`, `categories`, `variants`, and `files` (images). To request that multiple entities be cleaned please use `--clean=<entity>` for each entity.

You can skip: `convert-images`, `preprocess-csv`, `categories`, and `products`. The first two you really only need to run once over the freshly downloaded Adventure Works catalog data. The `products` step uploads missing images, creates missing variations, and creates products and variants.

Moltin API is rate-limited so the script does everything sequentially. It will run for about ten to twenty minutes and you should see something like this in your console:

```
Read 4 objects from /Users/pavel_veller/Downloads/Adventure Works 2014 OLTP Script/ProductCategory.csv file
Read 37 objects from /Users/pavel_veller/Downloads/Adventure Works 2014 OLTP Script/ProductSubcategory.csv file
Read 128 objects from /Users/pavel_veller/Downloads/Adventure Works 2014 OLTP Script/ProductModel.2.csv file
Read 762 objects from /Users/pavel_veller/Downloads/Adventure Works 2014 OLTP Script/ProductModelProductDescriptionCulture.csv file
Read 504 objects from /Users/pavel_veller/Downloads/Adventure Works 2014 OLTP Script/ProductProductPhoto.csv file
Read 504 objects from /Users/pavel_veller/Downloads/Adventure Works 2014 OLTP Script/Product.csv file
Read 762 objects from /Users/pavel_veller/Downloads/Adventure Works 2014 OLTP Script/ProductDescription.2.csv file
Read 31465 objects from /Users/pavel_veller/Downloads/Adventure Works 2014 OLTP Script/SalesOrderHeader.csv file
Read 101 objects from /Users/pavel_veller/Downloads/Adventure Works 2014 OLTP Script/ProductPhoto.csv file
Read 121317 objects from /Users/pavel_veller/Downloads/Adventure Works 2014 OLTP Script/SalesOrderDetail.csv file
Organizing categories into a hierarchy
Assigning images and categories to variants
Assigning description, variants, and modifiers to products
Organizing orders into a hierarchy
Attaching SKUs to orders
Catalog cleanup: removing Products
...
Importing products
Creating product [Classic Vest]
Assigning product [Classic Vest] to category [Vests]
Assiging applicable variations to Classic Vest
Assigning image no_image_available_large.png to 53da5576-d7d4-4970-9a0a-d27cd8585b09
Creating a product variant Classic Vest, S - VE-C304-S
Assigning image no_image_available_large.png to adcfd934-2a8e-4bec-b4cd-1b971b5e8b75
Creating a product variant Classic Vest, M - VE-C304-M
Assigning image no_image_available_large.png to e99d7450-eb43-488f-882a-1e9bfd5070b2
Creating a product variant Classic Vest, L - VE-C304-L
Assigning image no_image_available_large.png to acc9974a-2e96-4669-a821-5bdd4efb3256
...
Products import complete
New moltin catalog is ready to go
```

## License

MIT
