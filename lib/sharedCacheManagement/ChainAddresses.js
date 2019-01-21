'use strict';

/**
 * Chain addresses cache
 *
 * @module /lib/sharedCacheMultiManagement/ChainAddresses
 */

const rootPrefix = '../..',
  BaseSharedCacheManagement = require(rootPrefix + '/lib/sharedCacheManagement/Base'),
  chainAddressConst = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ChainAddressesModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

class ChainAddresses extends BaseSharedCacheManagement {
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.chainId = params['chainId'];
    oThis.cacheType = cacheManagementConst.sharedMemcached;
    oThis.consistentBehavior = '0';

    // Call sub class method to set cache key using params provided
    oThis.setCacheKey();

    // Call sub class method to set cache expiry using params provided
    oThis.setCacheExpiry();

    // Call sub class method to set cache implementer using params provided
    oThis.setCacheImplementer();
  }
  /**
   * set cache key
   *
   * @return {Object}
   */
  setCacheKey() {
    const oThis = this;

    oThis.cacheKey = (oThis._sharedCacheKeyPrefix() + 'c_add_' + oThis.chainId).toLowerCase();

    return oThis.cacheKey;
  }

  /**
   * set cache expiry in oThis.cacheExpiry and return it
   *
   * @return {Number}
   */
  setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 86400; // 24 hours

    return oThis.cacheExpiry;
  }

  /**
   * Fetch data from source.
   *
   * @return {Promise}
   */
  async fetchDataFromSource() {
    const oThis = this;

    let params = {
      chainId: oThis.chainId,
      kinds: Object.values(chainAddressConst.kinds)
    };

    let queryResponse = await new ChainAddressesModel().fetchAddresses(params);

    if (queryResponse.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_scm_ca_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { chainId: oThis.chainId }
        })
      );
    }

    let formattedResponse = {};

    formattedResponse[oThis.chainId] = queryResponse.data.address;
    Object.assign(formattedResponse[oThis.chainId], queryResponse.data.addresses);

    return Promise.resolve(responseHelper.successWithData(formattedResponse));
  }
}

module.exports = ChainAddresses;
