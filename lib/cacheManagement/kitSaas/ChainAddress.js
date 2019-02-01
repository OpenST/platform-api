'use strict';

/**
 * Chain addresses cache
 *
 * @module lib/cacheManagement/kitSaas/ChainAddress
 */

const rootPrefix = '../../..',
  CacheManagementKitSaasBase = require(rootPrefix + 'lib/cacheManagement/kitSaas/Base'),
  chainAddressConst = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ChainAddressesModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

class ChainAddress extends CacheManagementKitSaasBase {

  /**
   * @constructor
   *
   * @param {Object} params - associated ux chain id
   *
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.associatedAuxChainId = params['associatedAuxChainId'];
    oThis.cacheType = cacheManagementConst.sharedMemcached;
    oThis.consistentBehavior = '0';

    // Call sub class method to set cache level
    oThis._setCacheLevel();

    // Call sub class method to set cache key using params provided
    oThis.setCacheKey();

    // Call sub class method to set cache expiry using params provided
    oThis.setCacheExpiry();

    // Call sub class method to set cache implementer using params provided
    oThis.setCacheImplementer();
  }

  /**
   *
   * Set cache level
   *
   * @private
   */
  _setCacheLevel() {
    const oThis = this;
    oThis.cacheLevel = cacheManagementConst.kitSaasSubEnvLevel;
  }

  /**
   * set cache key
   *
   * @return {Object}
   */
  setCacheKey() {
    const oThis = this;

    oThis.cacheKey = (oThis._sharedCacheKeyPrefix() + 'chain_address_' + oThis.associatedAuxChainId).toLowerCase();

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
    let addressesHash = {},
      activeStatus = chainAddressConst.invertedStatuses[chainAddressConst.activeStatus];

    let dbRows = await new ChainAddressesModel()
      .select('*')
      .where(['associated_aux_chain_id = ? AND status = ?)', oThis.associatedAuxChainId, activeStatus])
      .fire();

    for (let i = 0; i < dbRows.length; i++) {
      let dbRow = dbRows[i],
        addressKindStr = chainAddressConst.kinds[dbRow.kind.toString()];

      let formatedData = {
        associatedAuxChainId: dbRow.associated_aux_chain_id,
        deployedChainId: dbRow.deployed_chain_id,
        deployedChainKind: chainAddressConst.deployedChainKinds[dbRow.deployed_chain_kind.toString()],
        address: dbRow.address,
        knownAddressId: dbRow.known_address_id
      };

      if (chainAddressConst.nonUniqueKinds.indexOf(addressKindStr) > -1) {
        if (!addressesHash[addressKindStr]) {
          addressesHash[addressKindStr] = [];
        }
        addressesHash[addressKindStr].push(formatedData);
      } else {
        addressesHash[addressKindStr] = formatedData;
      }
    }

    return Promise.resolve(responseHelper.successWithData(addressesHash));
  }
}

module.exports = ChainAddress;
