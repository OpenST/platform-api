'use strict';

/**
 * Cache for fetching pending operations of userId. Extends base cache.
 *
 * @module lib/cacheManagement/chain/UserPendingRecoveryOperations
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  ChainCacheManagementBase = require(rootPrefix + '/lib/cacheManagement/chain/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  RecoveryOperationModel = require(rootPrefix + '/app/models/mysql/RecoveryOperation'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

class UserPendingRecoveryOperations extends ChainCacheManagementBase {
  /**
   * Constructor for pending recoveries of user.
   *
   * @param {Object} params - cache key generation & expiry related params
   * @param params.tokenId {Number} - token id
   * @param params.userId {Number} - user id
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.userId = params.userId;
    oThis.tokenId = params.tokenId;

    // Call sub class method to set cache level
    oThis._setCacheLevel();

    // Call sub class method to set base cache level
    oThis._setCacheKey();

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
  /**
   * set cache key
   */
  _setCacheKey() {
    const oThis = this;

    oThis.cacheKey = (oThis._cacheKeyPrefix() + 'c_upro_' + oThis.tokenId + '_' + oThis.userId).toLowerCase();
  }

  /**
   * set cache expiry in oThis.cacheExpiry and return it
   */
  _setCacheExpiry() {
    const oThis = this;
    oThis.cacheExpiry = 86400; // 24 hours
  }

  /**
   * Fetch data from source.
   *
   * @returns {Result}
   */
  async fetchDataFromSource() {
    const oThis = this;

    let recoveryOperations = await new RecoveryOperationModel().getPendingOperationsOfTokenUser(
      oThis.tokenId,
      oThis.userId
    );

    return responseHelper.successWithData({
      recoveryOperations: recoveryOperations || []
    });
  }
}

InstanceComposer.registerAsShadowableClass(
  UserPendingRecoveryOperations,
  coreConstants.icNameSpace,
  'UserPendingRecoveryOperations'
);

module.exports = {};
