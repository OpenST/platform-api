/**
 * Module to define constants for conversion rates.
 *
 * @module lib/globalConstant/conversionRates
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

const conversionRates = {
  //TODO: OST & USDC Constants should move out to stake currency constants. They don't belong here.

  OST: 'OST',

  USDC: 'USDC',

  active: 'active',

  inactive: 'inactive',

  inProcess: 'inProcess'
};

const statuses = {
  '1': conversionRates.active,
  '2': conversionRates.inactive,
  '3': conversionRates.inProcess
};

const baseCurrencies = {
  '1': conversionRates.OST,
  '2': conversionRates.USDC
};

conversionRates.statuses = statuses;

conversionRates.invertedStatuses = util.invert(statuses);

conversionRates.baseCurrencies = baseCurrencies;

conversionRates.invertedBaseCurrencies = util.invert(baseCurrencies);

module.exports = conversionRates;
