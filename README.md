# Adventure Works catalog for Moltin

A set of scripts to setup the [Adventure Works](https://msftdbprodsamples.codeplex.com/releases/view/125550) product catalog in your [Moltin](https://moltin.com/) store.

## Motivation

I was building a conversational eCommerce chatbot for [my talk at API Strat](http://boston2016.apistrat.com/speakers/pavel-veller) and I needed a robust but easy to use API-first commerce platform with a decent free plan. This is how I discovered [Moltin](https://moltin.com/).

The next thing I needed was a sample store that would have categories and products with images and variants (like `color` and `size`). I also needed historical orders to build a recommendation model with [Cognitive Services Recommendations API](https://www.microsoft.com/cognitive-services/en-us/recommendations-api). This is how I discovered [Adventure Works](https://msftdbprodsamples.codeplex.com/releases/view/125550).

## Usage

To create your Adventure Works catalog in Moltin you'll need [node.js](https://nodejs.org/en/) (go for the latest 6.x as I am using ES6 straight up with no build step and [Babel](https://babeljs.io/)) Then:

* Sign up for Moltin and create a new store. Go to the store settings to get your API keys

* Set up two environment variables

```
export MOLTIN_PUBLIC_ID="<Client ID>"
export MOLTIN_SECRET_KEY="<Client Secret>"
```

* Download Adventure Works OLTP Script from [here](https://msftdbprodsamples.codeplex.com/downloads/get/880662) and unzip (for example to `~/Downloads/Adventure Works 2014 OLTP Script`)

* Clone this repository

```
git clone git@github.com:pveller/adventureworks-moltin.git
```

* Install packages

```
npm install
```

* Run `app.js` and supply the path to your Adventure Works files as a command line argument

```
node app.js "/Users/<yourself>/Downloads/Adventure Works 2014 OLTP Script"
```

It will run for about ten minutes and you should see something like this in your console:

```
Processing no_image_available_small.gif and no_image_available_large.gif
Processing racer02_black_f_small.gif and racer02_black_f_large.gif
Processing racer02_black_small.gif and racer02_black_large.gif
Processing racer02_blue_f_small.gif and racer02_blue_f_large.gif
Processing racer02_blue_small.gif and racer02_blue_large.gif
[...]
Processing of images is complete
Successfully created Bikes category
Successfully created Components category
Successfully created Bikes -> Mountain Bikes category
Successfully created Clothing category
Successfully created Bikes -> Road Bikes category
Successfully created Accessories category
Successfully created Bikes -> Touring Bikes category
[...]
Processing of categories is complete
Successfully created a default tax band
Read 37 objects from /Users/<user>/Downloads/Adventure Works 2014 OLTP Script/ProductSubcategory.csv file
Read 128 objects from /Users/<user>/Downloads/Adventure Works 2014 OLTP Script/ProductModel.2.csv file
[...]
*** Starting the next chunk of 10 ***
Creating product [Classic Vest]
Creating product [Cycling Cap]
Creating product [Full-Finger Gloves]
[...]
Creating modifier [color] for [LL Touring Frame]
Creating modifier [size] for [LL Touring Frame]
Creating modifier [color] for [Half-Finger Gloves]
Creating modifier [size] for [Half-Finger Gloves]
Creating modifier [color] for [HL Road Frame]
Creating modifier [size] for [HL Road Frame]
[...]
Adding a variation [color - Yellow] for LL Touring Frame
Adding a variation [color - Black] for Half-Finger Gloves
Adding a variation [color - Multi] for Cycling Cap
Adding a variation [color - Silver] for HL Mountain Frame
[...
]Adding a variation [color - Black] for Full-Finger Gloves
Adding a variation [color - Black] for LL Road Frame
Adding a variation [color - Blue] for LL Touring Frame
Adding a variation [size - S] for Half-Finger Gloves
Adding a variation [size - S] for Classic Vest
[...]
Changing SKU on the variation Cycling Cap Multi from P*CA-1098_MULTI to CA-1098
[...]
Deleting a variation [ML Mountain Frame-W 42 Black] that does not exist in the data
[...]
Products import complete
New moltin catalog is ready to go
```

## License

MIT
