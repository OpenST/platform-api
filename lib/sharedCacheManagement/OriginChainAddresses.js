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
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

class OriginChainAddresses extends BaseSharedCacheManagement {
  constructor() {
    super();

    const oThis = this;

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

    //fetch origin chainId
    let csHelper = new ConfigStrategyHelper(0),
      csResponse = await csHelper.getForKind(configStrategyConstants.constants),
      configConstants = csResponse.data[configStrategyConstants.constants],
      originChainId = configConstants.originChainId,
      addressesHash = {};

    let dbRows = await new ChainAddressesModel()
      .select('*')
      .where(['chain_id = ? AND aux_chain_id IS NULL', originChainId])
      .fire();

    for (let i = 0; i < dbRows.length; i++) {
      let dbRow = dbRows[i],
        addressKindStr = chainAddressConst.kinds[dbRow.kind.toString()];

      if (chainAddressConst.uniqueKinds.indexOf(addressKindStr) > -1) {
        addressesHash[addressKindStr] = dbRow.address;
      } else {
        if (!addressesHash[addressKindStr]) {
          addressesHash[addressKindStr] = [];
        }
        addressesHash[addressKindStr].push(dbRow.address);
      }
    }

    return Promise.resolve(responseHelper.successWithData(addressesHash));
  }
}

module.exports = OriginChainAddresses;
