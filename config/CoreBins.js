'use strict';

/**
 * Load all required contract abi files and export them.<br><br>
 *
 * @module config/core_abis
 */

const fs = require('fs'),
  path = require('path');

const rootPrefix = '..',
  nameToBinMap = {};

function readFile(filePath, options) {
  filePath = path.join(__dirname, '/' + filePath);
  return fs.readFileSync(filePath, options || 'utf8');
}

/**
 * Constructor for openST core contract abis
 *
 * @constructor
 */

class CoreBins {
  constructor() {}

  /**
   * Value Chain Contract: simple token EIP20 contract ABI.<br><br>
   *
   * @constant {object}
   *
   */
  static get simpleToken() {
    if (nameToBinMap['simpleToken']) return nameToBinMap['simpleToken'];
    nameToBinMap['simpleToken'] = readFile(rootPrefix + '/contracts/bin/SimpleToken.bin', 'utf8');
    return nameToBinMap['simpleToken'];
  }
}

module.exports = CoreBins;
