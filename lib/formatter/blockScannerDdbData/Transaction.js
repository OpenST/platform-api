/**
 * Formatter to handle data formatting for extra keys Saas dumps in transaction table
 *
 * @module lib/formatter/blockScannerDdbData/Transaction
 */

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
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
    const oThis = this;
    return responseHelper.successWithData(oThis.formattedParams);
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

    return responseHelper.successWithData(oThis.formattedParams);
  }
}

module.exports = TransactionFormatter;
