/**
 * Cache for fetching recovery owner details. Extends base cache.
 *
 * @module lib/cacheManagement/chainMulti/RecoveryOwnerDetails
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  CacheManagementChainMultiBase = require(rootPrefix + '/lib/cacheManagement/chainMulti/Base');

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/models/ddb/sharded/RecoveryOwner');
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

/**
 * Class for recovery owner details cache.
 *
 * @class RecoveryOwnerDetail
 */
class RecoveryOwnerDetail extends CacheManagementChainMultiBase {
  /**
   * Constructor for recovery owner details cache
   *
   * @param {Object} params
   * @param {Number} params.userId: user id
   * @param {Array} params.recoveryOwnerAddresses: recovery Address
   * @param {Number} params.shardNumber: shard number
   * @param {Number} params.tokenId: token id
   *
   * @augments CacheManagementChainMultiBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.userId = params.userId;
    oThis.recoveryOwnerAddresses = params.recoveryOwnerAddresses;
    oThis.shardNumber = params.shardNumber;
    oThis.tokenId = params.tokenId;

    // Call sub class method to set cache level
    oThis._setCacheLevel();

    // Call sub class method to set cache key using params provided
    oThis._setCacheKeys();

    oThis._setInvertedCacheKeys();

    // Call sub class method to set cache expiry using params provided
    oThis._setCacheExpiry();

    // Call sub class method to set cache implementer using params provided
    oThis._setCacheImplementer();
  }

  /**
   * Set cache level.
   *
   * @sets oThis.cacheLevel
   *
   * @private
   */
  _setCacheLevel() {
    const oThis = this;

    oThis.cacheLevel = cacheManagementConst.saasSubEnvLevel;
  }

  /**
   * Set cache key.
   *
   * @sets oThis.cacheKeys
   *
   * @return {String}
   */
  _setCacheKeys() {
    const oThis = this;

    for (let i = 0; i < oThis.recoveryOwnerAddresses.length; i++) {
      oThis.cacheKeys[
        oThis._cacheKeyPrefix() + 'c_c_rd_' + oThis.userId + '_' + oThis.recoveryOwnerAddresses[i].toLowerCase()
      ] =
        oThis.recoveryOwnerAddresses[i];
    }
  }

  /**
   * Set cache expiry.
   *
   * @sets oThis.cacheExpiry
   */
  _setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 3 * 24 * 60 * 60; // 72 hours ;
  }

  /**
   * Fetch data from source.
   *
   * @return {Result}
   */
  async fetchDataFromSource(cacheMissAddresses) {
    const oThis = this;

    if (!oThis.shardNumber) {
      let TokenUSerDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
        tokenUserDetailsCacheObj = new TokenUSerDetailsCache({ tokenId: oThis.tokenId, userIds: [oThis.userId] }),
        cacheFetchRsp = await tokenUserDetailsCacheObj.fetch();

      if (!CommonValidators.validateObject(cacheFetchRsp.data[oThis.userId])) {
        return Promise.reject(
          responseHelper.paramValidationError({
            internal_error_identifier: 'l_cm_cm_rod_1',
            api_error_identifier: 'resource_not_found',
            params_error_identifiers: ['user_not_found'],
            debug_options: {}
          })
        );
      }

      const userData = cacheFetchRsp.data[oThis.userId];

      oThis.shardNumber = userData['recoveryOwnerShardNumber'];
    }

    const RecoveryOwnerModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'RecoveryOwner'),
      recoveryOwnerObj = new RecoveryOwnerModel({ shardNumber: oThis.shardNumber });

    logger.debug('==== Fetching recovery owner details from source ====');

    let response = await recoveryOwnerObj.getRecoveryOwnerDetails({
      userId: oThis.userId,
      recoveryOwnerAddresses: cacheMissAddresses
    });

    return response;
  }

  /**
   * Validate data to set.
   *
   * @param dataToSet
   * @returns {*}
   */
  validateDataToSet(dataToSet) {
    return dataToSet;
  }
}

InstanceComposer.registerAsShadowableClass(RecoveryOwnerDetail, coreConstants.icNameSpace, 'RecoveryOwnerDetailCache');

module.exports = {};
