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
   * Perform
   *
   * @return {{}}
   */
  perform() {
    const oThis = this,
      formattedTransactionData = {};

    if (
      !oThis.params.hasOwnProperty('transactionUuid') ||
      !oThis.params.hasOwnProperty('fromAddress') ||
      !oThis.params.hasOwnProperty('toAddress') ||
      !oThis.params.hasOwnProperty('status') ||
      !oThis.params.hasOwnProperty('gasPrice') ||
      !oThis.params.hasOwnProperty('blockNumber') ||
      !oThis.params.hasOwnProperty('transfers')
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
    formattedTransactionData.from = oThis.params.fromAddress;
    formattedTransactionData.to = oThis.params.toAddress;
    formattedTransactionData.nonce = oThis.params.nonce || null;
    formattedTransactionData.value = oThis.params.value;
    formattedTransactionData.gas_price = oThis.params.gasPrice;
    formattedTransactionData.gas_used = oThis.params.gasUsed || 0;
    formattedTransactionData.transaction_fee = oThis.params.transactionFee.toString();
    formattedTransactionData.block_confirmation = oThis.params.blockConfirmation || 0;
    formattedTransactionData.status = oThis.params.status; // TODO: should be status
    formattedTransactionData.updated_timestamp = oThis.params.updatedTimestamp || Math.floor(Date.now() / 1000); // TODO: remove Date.now()
    formattedTransactionData.block_timestamp = oThis.params.blockTimestamp || null;
    formattedTransactionData.block_number = oThis.params.blockNumber || null;
    formattedTransactionData.rule_name = oThis.params.ruleName || null;

    formattedTransactionData.meta_property = {};

    formattedTransactionData.meta_property = {
      name: oThis.params.metaProperty['name'] || '',
      type: oThis.params.metaProperty['type'] || '',
      details: oThis.params.metaProperty['details'] || ''
    };

    formattedTransactionData.transfers = [];
    let transfers = oThis.params.transfers;
    for (let i = 0; i < transfers.length; i++) {
      let transfer = transfers[i];
      formattedTransactionData.transfers.push({
        from: transfer['fromAddress'],
        from_user_id: transfer['fromUserId'],
        to: transfer['toAddress'],
        to_user_id: transfer['toUserId'],
        amount: transfer['amount'],
        kind: transfer['kind'] || 'transfer'
      });
    }

    return responseHelper.successWithData(formattedTransactionData);
  }
}

module.exports = TransactionFormatter;
