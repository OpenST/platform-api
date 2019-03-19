/**
 * Formatter to handle data formatting for extra keys Saas dumps in pending tx table
 *
 * @module lib/formatter/blockScannerDdbData/PendingTransaction
 */
const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  balanceConstants = require(rootPrefix + '/lib/globalConstant/balance'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
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

    let transfers = oThis.params.transfers;
    if (transfers) {
      let formattedTransfers = [];
      for (let i = 0; i < transfers.length; i++) {
        let buffer = transfers[i];
        if (buffer['fromAddress'] && buffer['toAddress'] && buffer['value']) {
          formattedTransfers.push({
            fa: buffer['fromAddress'],
            ta: buffer['toAddress'],
            v: buffer['value']
          });
        }
        oThis.formattedParams.transfers = JSON.stringify(formattedTransfers);
      }
    }

    if (oThis.params.status) {
      oThis.formattedParams.status = pendingTransactionConstants.invertedStatuses[oThis.params.status];
    }

    if (oThis.params.kind) {
      oThis.formattedParams.kind = pendingTransactionConstants.invertedKinds[oThis.params.kind];
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

    let transfers = oThis.params.transfers;
    if (transfers) {
      transfers = JSON.parse(transfers);
      let formattedTransfers = [];
      for (let i = 0; i < transfers.length; i++) {
        let buffer = transfers[i];
        if (buffer['fa'] && buffer['ta'] && buffer['v']) {
          formattedTransfers.push({
            fromAddress: buffer['fa'],
            toAddress: buffer['ta'],
            value: buffer['v']
          });
        }
      }
      oThis.formattedParams.transfers = formattedTransfers;
    }

    if (oThis.params.eip1077Signature) {
      oThis.formattedParams.eip1077Signature = JSON.parse(oThis.params.eip1077Signature);
    }

    if (oThis.params.metaProperty) {
      let buffer = JSON.parse(oThis.params.metaProperty);
      oThis.formattedParams.metaProperty = {
        name: buffer.n,
        type: buffer.t,
        details: buffer.d
      };
    }

    if (oThis.params.status) {
      oThis.formattedParams.status = pendingTransactionConstants.statuses[oThis.params.status];
    }

    if (oThis.params.kind) {
      oThis.formattedParams.kind = pendingTransactionConstants.kinds[oThis.params.kind];
    }

    return responseHelper.successWithData(oThis.formattedParams);
  }
}

module.exports = PendingTxFormatter;
