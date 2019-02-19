/**
 * Formatter to handle data formatting for extra keys Saas dumps in pending tx table
 *
 * @module lib/formatter/blockScannerDdbData/PendingTransaction
 */
const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  balanceConstants = require(rootPrefix + '/lib/globalConstant/balance'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class for chain formatter.
 *
 * @class
 */
class PendingTxFormatter {
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

    if (oThis.params.unsettledDebits) {
      oThis.formattedParams.unsettledDebits = [];
      for (let i = 0; i < oThis.params.unsettledDebits.length; i++) {
        let buffer = oThis.params.unsettledDebits[i],
          formattedBuffer = {};
        for (let key in buffer) {
          formattedBuffer[balanceConstants.longNameToShortNameMap[key]] = buffer[key];
        }
        oThis.formattedParams.unsettledDebits.push(formattedBuffer);
      }
      oThis.formattedParams.unsettledDebits = JSON.stringify(oThis.formattedParams.unsettledDebits);
    }

    if (oThis.params.eip1077Signature) {
      oThis.formattedParams.eip1077Signature = JSON.stringify(oThis.params.eip1077Signature);
    }

    if (oThis.params.metaProperty) {
      let buffer = {
        n: oThis.params.metaProperty.name,
        t: oThis.params.metaProperty.type,
        d: oThis.params.metaProperty.details
      };
      oThis.formattedParams.metaProperty = JSON.stringify(buffer);
    }

    if (oThis.params.afterReceipt) {
      oThis.formattedParams.afterReceipt = JSON.stringify(oThis.params.afterReceipt);
    }

    return responseHelper.successWithData(oThis.formattedParams);
  }

  /**
   * format data that comes from ddb. mostly regarding elongation of keys
   *
   * @return {Promise<result>}
   */
  formatDataFromDdb() {
    const oThis = this;

    if (oThis.params.unsettledDebits) {
      oThis.formattedParams.unsettledDebits = [];
      let unsettledDebits = JSON.parse(oThis.params.unsettledDebits);
      for (let i = 0; i < unsettledDebits.length; i++) {
        let buffer = unsettledDebits[i],
          formattedBuffer = {};
        for (let key in buffer) {
          formattedBuffer[balanceConstants.shortNameToLongNameMap[key]] = buffer[key];
        }
        oThis.formattedParams.unsettledDebits.push(formattedBuffer);
      }
    }

    if (oThis.params.eip1077Signature) {
      oThis.formattedParams.eip1077Signature = JSON.parse(oThis.params.eip1077Signature);
    }

    if (oThis.params.metaProperty) {
      let buffer = JSON.parse(oThis.params.metaProperty);
      oThis.formattedParams.metaProperty = {
        n: buffer.name,
        t: buffer.type,
        d: buffer.details
      };
    }

    if (oThis.params.afterReceipt) {
      oThis.formattedParams.afterReceipt = JSON.parse(oThis.params.afterReceipt);
    }

    return responseHelper.successWithData(oThis.formattedParams);
  }
}

module.exports = PendingTxFormatter;
