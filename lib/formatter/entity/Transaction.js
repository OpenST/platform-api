/**
 * Formatter for transaction entity
 *
 * @module lib/formatter/entity/Transaction
 */

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class for transaction formatter.
 *
 * @class
 */
class TransactionFormatter {
  /**
   * Constructor for transaction formatter.
   *
   * @param {Object} params
   * @param {Number} params.id
   * @param {String} params.transactionHash
   * @param {String} params.from
   * @param {String} params.to
   * @param {Number} params.nonce
   * @param {String} params.value
   * @param {String} params.gas_price
   * @param {String} params.gas_used
   * @param {String} params.transaction_fee
   * @param {Bool} params.finalized
   * @param {String} params.status
   * @param {String} params.updated_timestamp
   * @param {String} params.block_timestamp
   * @param {Number} params.block_number
   * @param {String} params.rule_name
   * @param {Array} params.transfers
   * @param {Hash} params.meta_property
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.params = params;
  }

  /**
   * Perform
   *
   * @return {{}}
   */
  perform() {
    const oThis = this;

    let formattedTransactionData = {};

    formattedTransactionData.id = oThis.params.id;
    formattedTransactionData.transaction_hash = oThis.params.transactionHash || null;
    formattedTransactionData.from = oThis.params.from || null;
    formattedTransactionData.to = oThis.params.to || null;
    formattedTransactionData.nonce = oThis.params.nonce || null;
    formattedTransactionData.value = oThis.params.value || null;
    formattedTransactionData.gas_price = oThis.params.gasPrice || null;
    formattedTransactionData.gas_used = oThis.params.gasUsed || null;
    formattedTransactionData.transaction_fee = oThis.params.transactionFee || null;
    formattedTransactionData.finalized = oThis.params.finalized || null;
    formattedTransactionData.status = oThis.params.status || null;
    formattedTransactionData.updated_timestamp = oThis.params.updatedTimestamp || null;
    formattedTransactionData.block_timestamp = oThis.params.blockTimestamp || null;
    formattedTransactionData.block_number = oThis.params.blockNumber || null;
    formattedTransactionData.rule_name = oThis.params.ruleName || null;
    formattedTransactionData.transfers = oThis.params.transfers || null;
    formattedTransactionData.meta_property = oThis.params.metaProperty || null;

    return responseHelper.successWithData(formattedTransactionData);
  }
}

module.exports = TransactionFormatter;
