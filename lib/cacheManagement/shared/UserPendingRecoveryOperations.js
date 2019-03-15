'use strict';

/**
 * Cache for fetching pending operations of userId. Extends base cache.
 *
 * @module lib/cacheManagement/shared/UserPendingRecoveryOperations
 */

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  sharedCacheManagementBase = require(rootPrefix + '/lib/cacheManagement/shared/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  RecoveryOperationModel = require(rootPrefix + '/app/models/mysql/RecoveryOperation'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

class UserPendingRecoveryOperations extends sharedCacheManagementBase {
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
    oThis.cacheType = cacheManagementConst.sharedMemcached;

    oThis.userId = params.userId;
    oThis.tokenId = params.tokenId;

    // Call sub class method to set cache level
    oThis.setCacheLevel();

    // Call sub class method to set base cache level
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
  setCacheLevel() {
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
  setCacheKey() {
    const oThis = this;

    oThis.cacheKey = (oThis._sharedCacheKeyPrefix() + 'c_upro_' + oThis.tokenId + '_' + oThis.userId).toLowerCase();
  }

  /**
   * set cache expiry in oThis.cacheExpiry and return it
   */
  setCacheExpiry() {
    const oThis = this;
    oThis.cacheExpiry = 43200; // 12 hours
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

module.exports = UserPendingRecoveryOperations;
