'use strict';

const rootPrefix = '.',
  transactions = require(rootPrefix + '/services/transactions/service');

module.exports = {
  services: {
    transactions: transactions
  }
};
