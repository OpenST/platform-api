'use strict';

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

const conversionRates = {
  OST: 'OST',

  USD: 'USD',

  EUR: 'EUR',

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
  '1': conversionRates.OST
};

const quoteCurrencies = {
  '1': conversionRates.USD,
  '2': conversionRates.EUR
};

conversionRates.statuses = statuses;

conversionRates.invertedStatuses = util.invert(statuses);

conversionRates.baseCurrencies = baseCurrencies;

conversionRates.invertedBaseCurrencies = util.invert(baseCurrencies);

conversionRates.quoteCurrencies = quoteCurrencies;

conversionRates.invertedQuoteCurrencies = util.invert(quoteCurrencies);

module.exports = conversionRates;
