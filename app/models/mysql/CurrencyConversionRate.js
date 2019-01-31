'use strict';
/**
 * Model to get currency conversion details.
 *
 * @module app/models/mysql/CurrencyConversionRate
 */
const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  conversionRatesConstants = require(rootPrefix + '/lib/globalConstant/conversionRates');

const dbName = 'kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

class CurrencyConversionRateModel extends ModelBase {
  /**
   * Constructor for Currency Conversion Rate Model
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'currency_conversion_rates';
  }

  /**
   * Update transaction hash for a record
   *
   * @param {Number} id
   * @param {String} transactionHash
   *
   * @return {*|void}
   */
  updateTransactionHash(id, transactionHash) {
    const oThis = this;

    return oThis
      .update({ transaction_hash: transactionHash.toLowerCase() })
      .where({ id: id })
      .fire();
  }

  /**
   * Update Status for a record
   *
   * @param {Number} id
   * @param {String} status
   *
   * @return {*|void}
   */
  updateStatus(id, status) {
    const oThis = this;

    // Check if inverted data is present in input then use enumValues key
    if (conversionRatesConstants.invertedStatuses[status]) {
      status = conversionRatesConstants.invertedStatuses[status];
    }

    return oThis
      .update({ status: status })
      .where({ id: id })
      .fire();
  }

  /**
   * Get last active rates.
   *
   * @param {Number} chainId
   * @param {String} currency
   *
   * @return {*|void}
   */
  getLastActiveRates(chainId, currency) {
    const oThis = this;

    return oThis
      .select('*')
      .where({
        chain_id: chainId,
        quote_currency: conversionRatesConstants.invertedQuoteCurrencies[conversionRatesConstants[currency]],
        base_currency: conversionRatesConstants.invertedBaseCurrencies[conversionRatesConstants.OST]
      })
      .limit(1)
      .order_by('timestamp DESC')
      .fire();
  }
}

module.exports = CurrencyConversionRateModel;
