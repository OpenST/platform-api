'use strict';
/**
 * This service helps in fetching transaction
 *
 * @module app/services/transaction/get/Transaction
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  esServices = require(rootPrefix + '/lib/elasticsearch/manifest'),
  ESTransactionService = esServices.services.transactions,
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  GetTransactionBase = require(rootPrefix + '/app/services/transaction/get/Base');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/transactions/GetTransactionDetails');

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
   * perform - perform user creation
   *
   * @return {Promise<void>}
   */
  async _asyncPerform() {
    const oThis = this;

    const GetTransactionDetails = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'GetTransactionDetails'),
      serviceConfig = oThis._getServiceConfig(),
      service = new ESTransactionService(serviceConfig),
      esQuery = oThis._getQueryObject(),
      cacheResponse = await oThis._fetchUserFromCache(),
      userData = cacheResponse && cacheResponse.data[oThis.userId],
      tokenHolderAddress = userData && userData.tokenHolderAddress;

    let transactionDetails = await service.search(esQuery),
      transactionDetailsData = transactionDetails.data[oThis.auxChainId + '_transactions']; // Remove this

    if (transactionDetailsData[0] && !transactionDetailsData[0].user_addresses_status.includes(tokenHolderAddress)) {
      return responseHelper.paramValidationError({
        internal_error_identifier: 'a_s_t_g_t_2',
        api_error_identifier: 'invalid_api_params',
        params_error_identifiers: ['invalid_user_id'],
        debug_options: {}
      });
    }

    logger.debug('User transactions from Elastic search ', transactionDetails);

    if (transactionDetails.isSuccess() && transactionDetailsData.length !== 0) {
      let response = await new GetTransactionDetails({
        chainId: oThis.auxChainId,
        esSearchData: transactionDetails
      }).perform();
      return responseHelper.successWithData({ [resultType.transaction]: response.data[oThis.transactionId] });
    } else {
      return responseHelper.paramValidationError({
        internal_error_identifier: 'a_s_t_g_t_1',
        api_error_identifier: 'es_data_not_found',
        params_error_identifiers: ['invalid_transaction_id'],
        debug_options: { esData: transactionDetails }
      });
    }
  }

  /**
   * Get query object
   * @returns {{query: {terms: {_id: *[]}}}}
   *
   * @private
   */
  _getQueryObject() {
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
