'use strict';
/**
 * This service helps in fetching transaction by user id and transaction id.
 *
 * @module app/services/transaction/get/ById
 */
const OSTBase = require('@ostdotcom/base');

const rootPrefix = '../../../..',
  GetTransactionBase = require(rootPrefix + '/app/services/transaction/get/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

const InstanceComposer = OSTBase.InstanceComposer;

/**
 * Class to Get transaction by transactionId and userId
 *
 * @class
 */
class GetTransaction extends GetTransactionBase {
  /**
   * Constructor for execute transaction
   *
   * @param params
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.transactionId = params.transaction_id;
  }

  /**
   *
   * @private
   */
  _validateAndSanitizeParams() {
    // Nothing to do.
  }

  /**
   * Validate transaction uuid.
   *
   * @private
   */
  async _validateSearchResults() {
    const oThis = this;

    let transactionDetailsData = oThis.esSearchResponse.data[oThis.auxChainId + '_transactions'];

    // NOTE: Here tokenHolder address should be present in data coming from es,
    // else it is invalid as the query is done only on transaction uuid.
    if (
      oThis.esSearchResponse.isFailure() ||
      transactionDetailsData.length === 0 ||
      !transactionDetailsData[0].user_addresses_status.includes(oThis.tokenHolderAddress)
    ) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_t_g_bi_1',
          api_error_identifier: 'resource_not_found',
          params_error_identifiers: ['invalid_transaction_id'],
          debug_options: { esData: oThis.esSearchResponse }
        })
      );
    }
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
   *
   * @private
   */
  _formatApiResponse() {
    const oThis = this;
    return responseHelper.successWithData({
      [resultType.transaction]: oThis.txDetails[0]
    });
  }

  /**
   * Get ES query object
   *
   * @returns {{query: {terms: {_id: *[]}}}}
   *
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
