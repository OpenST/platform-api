'use strict';
/**
 * This is base class for all services.
 *
 * @module services/Base
 */
const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  TokenCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Token'),
  ClientConfigGroupCache = require(rootPrefix + '/lib/cacheManagement/shared/ClientConfigGroup');

const errorConfig = basicHelper.fetchErrorConfig(apiVersions.general);

/**
 * Base class for all services
 *
 * @class
 */
class ServicesBaseKlass {
  /**
   * Constructor for base class service
   *
   * @param {Object} params
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.tokenId = null;
    oThis.token = null;
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
      } else {
        logger.error(' In catch block of services/Base.js', err);
        return responseHelper.error({
          internal_error_identifier: 's_b_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { error: err.toString() },
          error_config: errorConfig
        });
      }
    });
  }

  /**
   * Async performer.
   *
   * @private
   * @returns {Promise<void>}
   */
  async _asyncPerform() {
    throw 'sub-class to implement';
  }

  /**
   * Fetch token details: fetch token details from cache
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fetchTokenDetails() {
    const oThis = this;

    let tokenCache = new TokenCache({
      clientId: oThis.clientId
    });

    let response = await tokenCache.fetch();
    if (!response.data) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_b_1',
          api_error_identifier: 'token_not_setup',
          debug_options: {}
        })
      );
    }

    oThis.token = response.data;
    oThis.tokenId = oThis.token.id;
  }

  /**
   * Fetch client config strategy
   *
   * @param clientId
   *
   * @returns {Promise<*>}
   *
   * @private
   */
  async _fetchClientConfigStrategy(clientId) {
    // Fetch client config group.
    let clientConfigStrategyCacheObj = new ClientConfigGroupCache({ clientId: clientId }),
      fetchCacheRsp = await clientConfigStrategyCacheObj.fetch();

    if (fetchCacheRsp.isFailure()) {
      logger.error(
        'ClientId has no config group assigned to it. This means that client has not been deployed successfully.'
      );
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_b_2',
          api_error_identifier: 'token_not_setup',
          debug_options: {}
        })
      );
    }

    return fetchCacheRsp;
  }

  /**
   * _parsePaginationParams - parse pagination identifier
   *
   * @param paginationIdentifier
   * @return {*}
   * @private
   */
  _parsePaginationParams(paginationIdentifier) {
    const oThis = this;

    return basicHelper.decryptPageIdentifier(paginationIdentifier);
  }

  /**
   * Validate limit
   *
   * @return {Promise<never>}
   *
   * @private
   */
  async _validatePageSize() {
    const oThis = this;

    let limitVas = CommonValidators.validateAndSanitizeLimit(
      oThis._currentPageLimit(),
      oThis._minPageLimit(),
      oThis._maxPageLimit()
    );

    if (!limitVas[0]) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 's_b_3',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_next_page_payload'],
          debug_options: {}
        })
      );
    }
  }

  _currentPageLimit() {
    throw 'Sub-class to implement';
  }

  _defaultPageLimit() {
    throw 'Sub-class to implement';
  }

  _minPageLimit() {
    throw 'Sub-class to implement';
  }

  _maxPageLimit() {
    throw 'Sub-class to implement';
  }
}

module.exports = ServicesBaseKlass;
