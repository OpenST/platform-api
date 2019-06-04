/**
 * Module to create transaction entity.
 *
 * @module lib/webhooks/delegator/transaction
 */

const rootPrefix = '../../..',
  TransactionFormatter = require(rootPrefix + '/lib/formatter/entity/Transaction'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/app/services/transaction/get/ById');

/**
 * Class to create transaction entity.
 *
 * @class Transaction
 */
class Transaction {
  /**
   * Main performer for class.
   *
   * @param {object} payload
   * @param {string} payload.webhookKind
   * @param {string} payload.clientId
   * @param {string} payload.userId
   * @param {string} payload.tokenId
   * @param {string} payload.transactionUuid
   * @param {object} ic
   *
   * @returns {Promise|*|undefined|Promise<T | never>}
   */
  perform(payload, ic) {
    const oThis = this;

    return oThis._asyncPerform(payload, ic).catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      }
      logger.error('lib/webhooks/delegator/transaction.js::perform::catch');
      logger.error(error);

      return responseHelper.error({
        internal_error_identifier: 'l_w_d_t_1',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: {}
      });
    });
  }

  /**
   * Async perform.
   *
   * @param {object} payload
   * @param {string} payload.webhookKind
   * @param {string} payload.clientId
   * @param {string} payload.userId
   * @param {string} payload.tokenId
   * @param {string} payload.transactionUuid
   * @param {object} ic
   *
   * @returns {Promise<void>}
   * @private
   */
  async _asyncPerform(payload, ic) {
    const oThis = this;

    const GetTransactionById = ic.getShadowedClassFor(coreConstants.icNameSpace, 'GetTransaction'),
      getTransactionById = new GetTransactionById({
        user_id: payload.userId,
        client_id: payload.clientId,
        transaction_id: payload.transactionUuid
      });

    const transactionResponse = await getTransactionById.perform();

    console.log('transactionResponse ======', transactionResponse);

    return oThis.formatTransactionData(transactionResponse.data[resultType.transaction]);
  }

  /**
   * Format transaction data using transaction entity formatter.
   *
   * @param {object} transactionData
   *
   * @returns {*|result}
   */
  formatTransactionData(transactionData) {
    const transactionFormattedRsp = new TransactionFormatter(transactionData).perform();

    return responseHelper.successWithData({
      result_type: resultType.transaction,
      [resultType.transaction]: transactionFormattedRsp.data
    });
  }
}

module.exports = new Transaction();
