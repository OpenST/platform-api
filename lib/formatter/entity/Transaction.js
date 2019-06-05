/**
 * Module for transaction entity formatter.
 *
 * @module lib/formatter/entity/Transaction
 */

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class for transaction formatter.
 *
 * @class TransactionFormatter
 */
class TransactionFormatter {
  /**
   * Constructor for transaction formatter.
   *
   * @param {Object} params
   * @param {Number} params.id
   * @param {String} params.transactionUuid
   * @param {String} params.transactionHash
   * @param {String} params.fromAddress
   * @param {String} params.toAddress
   * @param {Number} params.nonce
   * @param {String} params.value
   * @param {String} params.gasPrice
   * @param {String} params.gasUsed
   * @param {String} params.transactionFee
   * @param {String} params.status
   * @param {String} params.updatedTimestamp
   * @param {String} params.blockTimestamp
   * @param {Number} params.blockNumber
   * @param {Number} params.blockConfirmation
   * @param {String} params.ruleName
   * @param {Array} params.transfers
   * @param {Hash} params.metaProperty
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.params = params;
  }

  /**
   * Main performer for class.
   *
   * @return {{}}
   */
  perform() {
    const oThis = this,
      formattedTransactionData = {};

    if (
      !oThis.params.hasOwnProperty('transactionUuid') ||
      !oThis.params.hasOwnProperty('toAddress') ||
      !oThis.params.hasOwnProperty('status') ||
      !oThis.params.hasOwnProperty('gasPrice') ||
      !oThis.params.hasOwnProperty('transfers') ||
      !oThis.params.hasOwnProperty('updatedTimestamp')
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_f_e_tx_1',
          api_error_identifier: 'entity_formatting_failed',
          debug_options: { transactionParams: oThis.params }
        })
      );
    }

    formattedTransactionData.id = oThis.params.transactionUuid;
    formattedTransactionData.transaction_hash = oThis.params.transactionHash || null;
    formattedTransactionData.from = oThis.params.fromAddress || null;
    formattedTransactionData.to = oThis.params.toAddress;
    formattedTransactionData.nonce = Number(oThis.params.nonce) || null;
    formattedTransactionData.value = oThis.params.value || null;
    formattedTransactionData.gas_price = oThis.params.gasPrice;
    formattedTransactionData.gas_used = Number(oThis.params.gasUsed) || null;
    formattedTransactionData.transaction_fee = oThis.params.transactionFee || null;
    formattedTransactionData.block_confirmation = Number(oThis.params.blockConfirmation) || null;
    formattedTransactionData.status = oThis.params.status;
    formattedTransactionData.updated_timestamp = Number(oThis.params.updatedTimestamp);
    formattedTransactionData.block_timestamp = Number(oThis.params.blockTimestamp) || null;
    formattedTransactionData.block_number = Number(oThis.params.blockNumber) || null;
    formattedTransactionData.rule_name = oThis.params.ruleName || null;

    formattedTransactionData.meta_property = {};

    if (
      oThis.params.metaProperty &&
      (oThis.params.metaProperty['name'] || oThis.params.metaProperty['type'] || oThis.params.metaProperty['details'])
    ) {
      formattedTransactionData.meta_property = {
        name: oThis.params.metaProperty['name'] || null,
        type: oThis.params.metaProperty['type'] || null,
        details: oThis.params.metaProperty['details'] || null
      };
    }

    formattedTransactionData.transfers = [];
    let transfers = oThis.params.transfers;
    for (let i = 0; i < transfers.length; i++) {
      let transfer = transfers[i];
      formattedTransactionData.transfers.push({
        from: transfer['fromAddress'],
        from_user_id: transfer['fromUserId'] || null,
        to: transfer['toAddress'],
        to_user_id: transfer['toUserId'] || null,
        amount: transfer['amount'],
        kind: transfer['kind'] || 'transfer'
      });
    }

    return responseHelper.successWithData(formattedTransactionData);
  }
}

module.exports = TransactionFormatter;
