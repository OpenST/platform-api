'use strict';
/**
 * Chain addresses cache
 *
 * @module lib/cacheManagement/kitSaas/ChainAddress
 */

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainAddressConst = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ChainAddressesModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  CacheManagementKitSaasBase = require(rootPrefix + '/lib/cacheManagement/kitSaas/Base');

/**
 * Class for chain address cache.
 *
 * @class
 */
class ChainAddress extends CacheManagementKitSaasBase {
  /**
   * Constructor for chain address cache.
   *
   * @param {Object} params
   * @param {Object} params.associatedAuxChainId: associated aux chain id
   *
   * @constructor
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
    oThis._setCacheKeySuffix();

    // Call sub class method to set cache expiry using params provided
    oThis._setCacheExpiry();

    // Call sub class method to set cache implementer using params provided
    oThis._setCacheImplementer();
  }

  /**
   * Set cache level
   *
   * @private
   */
  _setCacheLevel() {
    const oThis = this;
    oThis.cacheLevel = cacheManagementConst.kitSaasSubEnvLevel;
  }

  _setCacheKeySuffix() {
    const oThis = this;
    // It uses shared cache key between company api and saas. any changes in key here should be synced
    oThis.cacheKeySuffix = `ch_addr_${oThis.associatedAuxChainId}`;
  }

  /**
   * Set cache expiry in oThis.cacheExpiry and return it
   *
   * @return {Number}
   *
   * @private
   */
  _setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 86400; // 24 hours

    return oThis.cacheExpiry;
  }

  /**
   * Fetch data from source.
   *
   * @return {Promise}
   *
   * @private
   */
  async _fetchDataFromSource() {
    const oThis = this,
      activeStatus = chainAddressConst.invertedStatuses[chainAddressConst.activeStatus];

    let addressesHash = {};

    let dbRows = await new ChainAddressesModel()
      .select('*')
      .where(['associated_aux_chain_id = ? AND status = ?', oThis.associatedAuxChainId, activeStatus])
      .fire();

    for (let i = 0; i < dbRows.length; i++) {
      let dbRow = dbRows[i],
        addressKindStr = chainAddressConst.kinds[dbRow.kind.toString()],
        deployedChainKind = dbRow.deployed_chain_kind
          ? chainAddressConst.deployedChainKinds[dbRow.deployed_chain_kind.toString()]
          : dbRow.deployed_chain_kind;

      let formatedData = {
        deployedChainId: dbRow.deployed_chain_id,
        deployedChainKind: deployedChainKind,
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
