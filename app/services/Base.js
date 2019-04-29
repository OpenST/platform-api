/**
 * This is base class for all services.
 *
 * @module app/services/Base
 */

const rootPrefix = '../..',
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  TokenCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Token'),
  ClientConfigGroupCache = require(rootPrefix + '/lib/cacheManagement/shared/ClientConfigGroup'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  tokenConstants = require(rootPrefix + '/lib/globalConstant/token'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions');

// Declare error config.
const errorConfig = basicHelper.fetchErrorConfig(apiVersions.general);

/**
 * Base class for all services.
 *
 * @class ServicesBaseKlass
 */
class ServicesBaseKlass {
  /**
   * Constructor for base class for all services.
   *
   * @constructor
   */
  constructor() {
    const oThis = this;

    oThis.token = null;
    oThis.tokenId = null;
    oThis.delayedRecoveryInterval = null;
  }

  /**
   * Main performer method for the class.
   *
   * @returns {Promise<T>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(err) {
      if (responseHelper.isCustomResult(err)) {
        return err;
      }
      logger.error(' In catch block of services/Base.js', err);

      return responseHelper.error({
        internal_error_identifier: 'a_s_b_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: { error: err.toString() },
        error_config: errorConfig
      });
    });
  }

  /**
   * Async perform.
   *
   * @private
   * @returns {Promise<void>}
   */
  async _asyncPerform() {
    throw new Error('sub-class to implement.');
  }

  /**
   * Fetch token details from cache.
   *
   * @sets oThis.token, oThis.tokenId, oThis.delayedRecoveryInterval
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchTokenDetails() {
    const oThis = this;

    const tokenCache = new TokenCache({
      clientId: oThis.clientId
    });

    const response = await tokenCache.fetch();
    if (!response.data) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_b_2',
          api_error_identifier: 'token_not_setup',
          debug_options: {}
        })
      );
    }

    oThis.token = response.data;
    oThis.tokenId = oThis.token.id;
    oThis.delayedRecoveryInterval = oThis.token.delayedRecoveryInterval;
  }

  /**
   * Validate token status.
   *
   * @returns {Promise<Void>}
   * @private
   */
  async _validateTokenStatus() {
    const oThis = this;

    if (!oThis.token) {
      await oThis._fetchTokenDetails();
    }

    if (!oThis.token || oThis.token.status != tokenConstants.invertedStatuses[tokenConstants.deploymentCompleted]) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_b_3',
          api_error_identifier: 'token_not_setup',
          debug_options: {}
        })
      );
    }
  }

  /**
   * Fetch client config strategy.
   *
   * @param {number/string} clientId
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchClientConfigStrategy(clientId) {
    // Fetch client config group.
    const clientConfigStrategyCacheObj = new ClientConfigGroupCache({ clientId: clientId }),
      fetchCacheRsp = await clientConfigStrategyCacheObj.fetch();

    if (fetchCacheRsp.isFailure()) {
      logger.error(
        'ClientId has no config group assigned to it. This means that client has not been deployed successfully.'
      );

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_b_4',
          api_error_identifier: 'token_not_setup',
          debug_options: {}
        })
      );
    }

    return fetchCacheRsp;
  }

  /**
   * Parse pagination identifier.
   *
   * @param {string} paginationIdentifier
   *
   * @return {*}
   * @private
   */
  _parsePaginationParams(paginationIdentifier) {
    return basicHelper.decryptPageIdentifier(paginationIdentifier);
  }

  /**
   * Validate page size.
   *
   * @sets oThis.limit
   *
   * @return {Promise<never>}
   * @private
   */
  async _validatePageSize() {
    const oThis = this;

    const limitVas = CommonValidators.validateAndSanitizeLimit(
      oThis._currentPageLimit(),
      oThis._defaultPageLimit(),
      oThis._minPageLimit(),
      oThis._maxPageLimit()
    );

    if (!limitVas[0]) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_b_5',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_limit'],
          debug_options: {}
        })
      );
    }

    oThis.limit = limitVas[1];
  }

  _currentPageLimit() {
    throw new Error('Sub-class to implement');
  }

  _defaultPageLimit() {
    throw new Error('Sub-class to implement');
  }

  _minPageLimit() {
    throw new Error('Sub-class to implement');
  }

  _maxPageLimit() {
    throw new Error('Sub-class to implement');
  }
}

module.exports = ServicesBaseKlass;
