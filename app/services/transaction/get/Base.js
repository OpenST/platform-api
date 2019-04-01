'use strict';
/**
 * This service helps in fetching transaction
 *
 * @module app/services/transaction/get/Base
 */

const OSTBase = require('@ostdotcom/base');

const rootPrefix = '../../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  ErrorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  esServices = require(rootPrefix + '/lib/elasticsearch/manifest'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

const InstanceComposer = OSTBase.InstanceComposer,
  ESTransactionService = esServices.services.transactions;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');
require(rootPrefix + '/lib/transactions/GetTransactionDetails');

/**
 * Get transaction base class
 *
 * @class
 */
class GetTransactionBase extends ServiceBase {
  /**
   *
   * @param {Object} params
   * @param {Integer} params.user_id
   * @param {Integer} params.client_id
   *
   */
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.userId = params.user_id;
    oThis.clientId = params.client_id;

    oThis.esConfig = {};
    oThis.tokenId = null;
    oThis.configStrategyObj = null;
    oThis.auxChainId = null;
    oThis.tokenHolderAddress = null;
    oThis.txDetails = [];
  }

  /**
   * Async performer
   *
   * @return {Promise<void>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._validateAndSanitizeParams();

    await oThis._validateTokenStatus();

    await oThis._getEsConfig();

    await oThis._fetchUserFromCache();

    await oThis._searchInEs();

    await oThis._validateSearchResults();

    oThis._setMeta();

    await oThis._fetchTxDetails();

    return oThis._formatApiResponse();
  }

  /**
   * Get service config
   *
   * Eg finalConfig = {
   *             "chainId": 123, //Aux chainId
   *             "elasticSearch": {
   *               "host":"localhost:9200",
   *               "region":"localhost",
   *               "apiKey":"elastic",
   *               "apiSecret":"changeme",
   *               "apiVersion":"6.2"
   *               }
   *            }
   * @returns {*}
   *
   * @private
   */
  _getEsConfig() {
    const oThis = this;

    let configStrategy = oThis._configStrategyObject,
      esConfig = configStrategy.elasticSearchConfig,
      elasticSearchKey = configStrategyConstants.elasticSearch;

    oThis.auxChainId = configStrategy.auxChainId;

    oThis.esConfig.chainId = oThis.auxChainId;
    oThis.esConfig[elasticSearchKey] = esConfig;
  }

  /**
   * Fetch user details.
   *
   * @return {Promise<string>}
   */
  async _fetchUserFromCache() {
    const oThis = this;

    let instanceComposer = new InstanceComposer(oThis._configStrategy);

    let TokenUserDetailsCache = instanceComposer.getShadowedClassFor(
        coreConstants.icNameSpace,
        'TokenUserDetailsCache'
      ),
      tokenUserDetailsCacheObj = new TokenUserDetailsCache({ tokenId: oThis.tokenId, userIds: [oThis.userId] });

    let userCacheResponse = await tokenUserDetailsCacheObj.fetch(),
      userCacheResponseData = userCacheResponse.data[oThis.userId];

    oThis.tokenHolderAddress = userCacheResponseData.tokenHolderAddress;

    if (basicHelper.isEmptyObject(userCacheResponseData) || !oThis.tokenHolderAddress) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_t_g_b_1',
          api_error_identifier: 'resource_not_found',
          params_error_identifiers: ['invalid_user_id'],
          debug_options: {}
        })
      );
    }
  }

  /**
   * Search in ES.
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _searchInEs() {
    const oThis = this;

    let esService = new ESTransactionService(oThis.esConfig),
      esQuery = oThis._getEsQueryObject();

    oThis.esSearchResponse = await esService.search(esQuery);

    if (oThis.esSearchResponse.isFailure()) {
      const errorObject = responseHelper.error({
        internal_error_identifier: 'elastic_search_service_down:a_s_t_g_b_2',
        api_error_identifier: 'elastic_search_service_down',
        debug_options: {}
      });
      await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_t_g_b_2',
          api_error_identifier: 'elastic_search_service_down',
          debug_options: {}
        })
      );
    }

    logger.debug('User transactions from Elastic search ', oThis.esSearchResponse);
  }

  /**
   * Fetch tx details.
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _fetchTxDetails() {
    const oThis = this;

    let GetTransactionDetails = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'GetTransactionDetails'),
      transactionsResponse = await new GetTransactionDetails({
        chainId: oThis.auxChainId,
        tokenId: oThis.tokenId,
        esSearchResponse: oThis.esSearchResponse
      }).perform();

    oThis.txDetails = transactionsResponse.data;
  }

  /**
   * Config strategy
   *
   * @return {Object}
   *
   * @private
   */
  get _configStrategy() {
    const oThis = this;

    return oThis.ic().configStrategy;
  }

  /**
   * Object of config strategy class
   *
   * @return {Object}
   *
   * @private
   */
  get _configStrategyObject() {
    const oThis = this;

    if (oThis.configStrategyObj) return oThis.configStrategyObj;

    oThis.configStrategyObj = new ConfigStrategyObject(oThis._configStrategy);

    return oThis.configStrategyObj;
  }

  /**
   * Validate and sanitize params.
   *
   * @private
   */
  _validateAndSanitizeParams() {
    throw 'sub-class to implement.';
  }

  /**
   * Validate search results.
   *
   * @private
   */
  _validateSearchResults() {
    throw 'sub-class to implement.';
  }

  /**
   * Set meta.
   *
   * @private
   */
  _setMeta() {
    throw 'sub-class to implement.';
  }

  /**
   * Format api response.
   *
   * @private
   */
  _formatApiResponse() {
    throw 'sub-class to implement.';
  }

  /**
   * Get ES query object
   *
   * @returns {{query: {terms: {_id: *[]}}}}
   *
   * @private
   */
  _getEsQueryObject() {
    throw 'sub-class to implement.';
  }
}

module.exports = GetTransactionBase;
