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
  TokenCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Token'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions');

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
    oThis.params = params;

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
   * _fetchTokenDetails - fetch token details from cache
   *
   * @return {Promise<void>}
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
}

module.exports = ServicesBaseKlass;
