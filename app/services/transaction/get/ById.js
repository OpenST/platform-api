/**
 * Module to fetch transaction by user id and transaction id.
 *
 * @module app/services/transaction/get/ById
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  GetTransactionBase = require(rootPrefix + '/app/services/transaction/get/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

/**
 * Class to fetch transaction by user id and transaction id.
 *
 * @class GetTransaction
 */
class GetTransaction extends GetTransactionBase {
  /**
   * Constructor to fetch transaction by user id and transaction id.
   *
   * @param {object} params
   * @param {number} params.user_id
   * @param {number} params.client_id
   * @param {string} params.transaction_id
   *
   * @augments GetTransactionBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.transactionId = params.transaction_id;
  }

  /**
   * Validate and sanitize parameters.
   *
   * @private
   */
  _validateAndSanitizeParams() {
    // Nothing to do.
  }

  /**
   * Validate transaction uuid.
   *
   * @returns {Promise<Promise<never>|undefined>}
   * @private
   */
  async _validateSearchResults() {
    const oThis = this;
    console.log('oThis.tokenHolderAddress ===========', oThis.tokenHolderAddress);
    console.log('oThis.txDetails.transfers==========', JSON.stringify(oThis.txDetails[0].transfers));
    if (oThis.txDetails[0] && oThis.txDetails[0].transfers) {
      for (let index = 0; index < oThis.txDetails[0].transfers.length; index++) {
        const transfer = oThis.txDetails[0].transfers[index];
        if (transfer.fromAddress === oThis.tokenHolderAddress || transfer.toAddress === oThis.tokenHolderAddress) {
          return;
        }
      }
    }

    return Promise.reject(
      responseHelper.paramValidationError({
        internal_error_identifier: 'a_s_t_g_bi_1',
        api_error_identifier: 'resource_not_found',
        params_error_identifiers: ['invalid_transaction_id'],
        debug_options: { esData: oThis.esSearchResponse }
      })
    );

    // NOTE: Here tokenHolder address should be present in data coming from es,
    // Else it is invalid as the query is done only on transaction uuid.
    // if (
    //   oThis.esSearchResponse.isFailure() ||
    //   transactionDetailsData.length === 0 ||
    //   !transactionDetailsData[0].user_addresses_status.includes(oThis.tokenHolderAddress)
    // ) {
    //   return Promise.reject(
    //     responseHelper.paramValidationError({
    //       internal_error_identifier: 'a_s_t_g_bi_1',
    //       api_error_identifier: 'resource_not_found',
    //       params_error_identifiers: ['invalid_transaction_id'],
    //       debug_options: { esData: oThis.esSearchResponse }
    //     })
    //   );
    // }
  }

  /**
   * Set meta.
   *
   * @private
   */
  _setMeta() {
    // Nothing to do.
  }

  /**
   * Format API response
   *
   * @return {*}
   * @private
   */
  _formatApiResponse() {
    const oThis = this;

    return responseHelper.successWithData({
      [resultType.transaction]: oThis.txDetails[0]
    });
  }

  /**
   * Get ES query object.
   *
   * @returns {{query: {terms: {_id: *[]}}}}
   * @private
   */
  _getEsQueryObject() {
    const oThis = this;

    return {
      query: {
        terms: {
          _id: [oThis.transactionId]
        }
      }
    };
  }
}

InstanceComposer.registerAsShadowableClass(GetTransaction, coreConstants.icNameSpace, 'GetTransaction');

module.exports = {};
