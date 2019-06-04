/**
 * Module to define constants for quote currencies.
 *
 * @module lib/globalConstant/quoteCurrency.js
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

let invertedStatuses;
let invertedQuoteCurrencies;

class QuoteCurrency {
  get USD() {
    return 'USD';
  }

  get EUR() {
    return 'EUR';
  }

  get activeStatus() {
    return 'active';
  }

  get inActiveStatus() {
    return 'inActive';
  }

  get statuses() {
    const oThis = this;

    return {
      '1': oThis.activeStatus,
      '2': oThis.inActiveStatus
    };
  }

  get invertedStatuses() {
    const oThis = this;

    if (invertedStatuses) {
      return invertedStatuses;
    }

    invertedStatuses = util.invert(oThis.statuses);

    return invertedStatuses;
  }

  get quoteCurrencies() {
    const oThis = this;
    return {
      '1': oThis.USD,
      '2': oThis.EUR
    };
  }

  get invertedQuoteCurrencies() {
    const oThis = this;

    if (invertedQuoteCurrencies) {
      return invertedQuoteCurrencies;
    }

    invertedQuoteCurrencies = util.invert(oThis.quoteCurrencies);
    return invertedQuoteCurrencies;
  }
}

module.exports = new QuoteCurrency();
