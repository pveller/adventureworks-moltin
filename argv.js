'use strict';

const fs = require('fs');
const argv = require('minimist')(process.argv.slice(2));

const path = argv._[0];
if (!path || !fs.existsSync(path)) {
  throw 'Please specify a valid file system path to the Adventure Works catalog files as a command line argument';
}

const isRequested = (arg, value) => {
  if (!value) {
    return argv[arg];
  }

  if (typeof argv[arg] === 'string') {
    return argv[arg] === value;
  }

  if (Array.isArray(argv[arg])) {
    return argv[arg].includes(value);
  }

  return false;
};

module.exports = {
  path,
  clean: entity => isRequested('clean', entity),
  skip: step => isRequested('skip', step)
};
