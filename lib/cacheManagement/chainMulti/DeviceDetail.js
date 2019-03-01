'use strict';

/**
 * Cache for fetching device details. Extends base cache.
 *
 * @module lib/cacheManagement/chainMulti/DeviceDetail
 */

const rootPrefix = '../../..',
  OSTBase = require('@ostdotcom/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  CacheManagementChainMultiBase = require(rootPrefix + '/lib/cacheManagement/chainMulti/Base');

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/models/ddb/sharded/Device');
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

const InstanceComposer = OSTBase.InstanceComposer;

class DeviceDetail extends CacheManagementChainMultiBase {
  /**
   * Constructor for device details cache
   *
   * @param {Object} params
   * @param {Number} params.userId  - user id
   * @param {Array} params.walletAddresses  - wallet Address
   * @param {Number} params.shardNumber  - shard number
   * @param {Number} params.tokenId  - token id
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.userId = params.userId;
    oThis.walletAddresses = params.walletAddresses;
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
   *
   * Set cache level
   *
   * @private
   */
  _setCacheLevel() {
    const oThis = this;
    oThis.cacheLevel = cacheManagementConst.saasSubEnvLevel;
  }

  /**
   * set cache key
   *
   * @return {String}
   */
  _setCacheKeys() {
    const oThis = this;

    for (let i = 0; i < oThis.walletAddresses.length; i++) {
      oThis.cacheKeys[
        oThis._cacheKeyPrefix() + 'c_c_dd_' + oThis.userId + '_' + oThis.walletAddresses[i].toLowerCase()
      ] =
        oThis.walletAddresses[i];
    }
  }

  /**
   * set cache expiry in oThis.cacheExpiry and return it
   */
  _setCacheExpiry() {
    const oThis = this;
    oThis.cacheExpiry = 3 * 24 * 60 * 60; // 72 hours ;
  }

  /**
   * fetch data from source
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
            internal_error_identifier: 'l_cm_c_wabui_1',
            api_error_identifier: 'resource_not_found',
            params_error_identifiers: ['user_not_found'],
            debug_options: {}
          })
        );
      }

      const userData = cacheFetchRsp.data[oThis.userId];

      oThis.shardNumber = userData['deviceShardNumber'];
    }

    let DeviceModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'DeviceModel'),
      deviceObj = new DeviceModel({ shardNumber: oThis.shardNumber });

    logger.debug('==== Fetching data from source ====');

    let response = await deviceObj.getDeviceDetails({
      userId: oThis.userId,
      walletAddresses: cacheMissAddresses
    });

    return response;
  }
}

InstanceComposer.registerAsShadowableClass(DeviceDetail, coreConstants.icNameSpace, 'DeviceDetailCache');

module.exports = {};
