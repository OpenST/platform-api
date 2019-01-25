'use strict';

/**
 *
 * @module lib/globalConstant/currencies
 */
const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

// Declare constants.

const currencies = {
    stPrime: 'stPrime',
    eth: 'eth'
  },
  kind = {
    '1': currencies.stPrime,
    '2': currencies.eth
  };

currencies.kinds = kind;
currencies.invertedKinds = util.invert(kind);

module.exports = currencies;
