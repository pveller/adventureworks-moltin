'use strict';

const Moltin = require('./moltin');
const fs = require('fs');
const csv = require('csv');

module.exports = async function(path, catalog) {
  for (let category of catalog.categories) {
    console.log('Creating category %s', category.name);

    const categoryM = await Moltin.Categories.Create({
      type: 'category',
      name: category.name,
      description: category.name,
      slug: category.name.toLowerCase(),
      status: 'live'
    });

    if (category.children.length === 0) {
      continue;
    }

    const subCategoriesM = [];
    for (subCategory of category.children) {
      console.log(
        'Creating a category %s -> %s',
        category.name,
        subCategory.name
      );

      const subCategoryM = await Moltin.Categories.Create({
        type: 'category',
        name: subCategory.name,
        description: subCategory.name,
        slug: subCategory.name.toLowerCase(),
        status: 'live'
      });

      subCategoriesM.push(subCategoryM);
    }

    console.log('Creating parent -> child relationships for %s', category.name);
    await Moltin.Categories.CreateRelationships(
      categoryM.data.id,
      'children',
      subCategoriesM.map(child => ({
        type: 'category',
        id: child.data.id
      }))
    );
  }
};
