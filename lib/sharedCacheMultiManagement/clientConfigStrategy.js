'use strict';

/**
 * Class to get client config strategy details from cache. Extends the baseCache class.
 *
 * @module /lib/sharedCacheMultiManagement/clientConfigStrategy
 */

const rootPrefix = '../..',
  baseCache = require(rootPrefix + '/lib/sharedCacheMultiManagement/base'),
  ClientConfigStrategiesModel = require(rootPrefix + '/app/models/mysql/ClientConfigStrategy'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  util = require(rootPrefix + '/lib/util'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

class ClientConfigStrategiesCacheKlass extends baseCache {
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientIds = params['clientIds'];
    oThis.cacheType = cacheManagementConst.sharedMemcached;
    oThis.consistentBehavior = '0';

    // Call sub class method to set cache key using params provided
    oThis.setCacheKeys();

    // Call sub class method to set cache expiry using params provided
    oThis.setCacheExpiry();

    // Call sub class method to set cache implementer using params provided
    oThis.setCacheImplementer();
  }
  /**
   * set cache keys
   *
   * @return {Object}
   */
  setCacheKeys() {
    const oThis = this;

    oThis.cacheKeys = {};

    for (let i = 0; i < oThis.clientIds.length; i++) {
      oThis.cacheKeys[oThis._cacheKeyPrefix() + 'cs_ccs_' + oThis.clientIds[i]] = oThis.clientIds[i].toString();
    }
    oThis.invertedCacheKeys = util.invert(oThis.cacheKeys);

    return oThis.cacheKeys;
  }

  /**
   * set cache expiry in oThis.cacheExpiry and return it
   *
   * @return {Number}
   */
  setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 86400 * 30; // 30 days;

    return oThis.cacheExpiry;
  }

  /**
   * Fetch data from source.
   *
   * @return {Promise}
   */
  async fetchDataFromSource(cacheMissClientIds) {
    const oThis = this,
      clientConfigStrategiesModelObj = new ClientConfigStrategiesModel(),
      queryResponses = await clientConfigStrategiesModelObj.getByClientIds(cacheMissClientIds);

    if (!queryResponses) {
      return responseHelper.error({
        internal_error_identifier: 'scmm_ccs_1',
        api_error_identifier: 'no_data_found',
        error_config: errorConfig
      });
    }

    let formattedResponse = {};

    for (let i = 0; i < queryResponses.length; i++) {
      let queryResponse = queryResponses[i];

      if (!formattedResponse[queryResponse.client_id]) {
        formattedResponse[queryResponse.client_id] = {
          configStrategyIds: []
        };
      }

      formattedResponse[queryResponse.client_id]['configStrategyIds'].push(queryResponse['config_strategy_id']);
    }

    return Promise.resolve(responseHelper.successWithData(formattedResponse));
  }
}

module.exports = ClientConfigStrategiesCacheKlass;
