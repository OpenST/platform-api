/**
 * Formatter to handle data formatting for extra keys Saas dumps in transaction table
 *
 * @module lib/formatter/blockScannerDdbData/Transaction
 */

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 *
 * @class
 */
class TransactionFormatter {
  /**
   * Constructor
   *
   * @param {Object} params
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;
    oThis.params = params;
    oThis.formattedParams = basicHelper.deepDup(params);
  }

  /**
   * format data that would go into ddb. mostly regarding shorting of keys
   *
   * @return {Promise<result>}
   */
  formatDataForDdb() {
    throw 'formatDataForDdb called for Transaction.';
  }

  /**
   * format data that comes from ddb. mostly regarding elongation of keys
   *
   * @return {Promise<result>}
   */
  formatDataFromDdb() {
    const oThis = this;

    if (oThis.params.metaProperty && typeof oThis.params.metaProperty === 'string') {
      oThis.formattedParams.metaProperty = {};

      let buffer = JSON.parse(oThis.params.metaProperty);
      oThis.formattedParams.metaProperty = {
        name: buffer.n,
        type: buffer.t,
        details: buffer.d
      };
    }

    oThis.formattedParams.transfers = [];

    if (oThis.params.transfers && typeof oThis.params.transfers === 'string') {
      let transfers = JSON.parse(oThis.params.transfers);

      for (let i = 0; i < transfers.length; i++) {
        let transfer = transfers[i];

        oThis.formattedParams.transfers.push({
          fromAddress: transfer.fa,
          toAddress: transfer.ta,
          value: transfer.v
        });
      }
    }

    if (oThis.params['kind']) {
      oThis.formattedParams['kind'] = pendingTransactionConstants.kinds[oThis.params['kind']];
    }

    return responseHelper.successWithData(oThis.formattedParams);
  }
}

module.exports = TransactionFormatter;
