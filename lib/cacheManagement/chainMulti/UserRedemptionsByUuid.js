/**
 * Cache for fetching redemptions by ids. Extends base cache.
 *
 * @module lib/cacheManagement/chainMulti/RedemptionsById
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  UserRedemptionModel = require(rootPrefix + '/app/models/mysql/UserRedemption'),
  CacheManagementChainMultiBase = require(rootPrefix + '/lib/cacheManagement/chainMulti/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

// Following require(s) for registering into instance composer

/**
 * Class for redemption by ids
 *
 * @class UserRedemptionsByUuid
 */
class UserRedemptionsByUuid extends CacheManagementChainMultiBase {
  /**
   * Constructor for redemptions by id
   *
   * @param {Object} params
   * @param {Number} params.uuids: redemption uuids
   *
   * @augments CacheManagementChainMultiBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.ids = params.uuids;

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

    for (let ind = 0; ind < oThis.ids.length; ind++) {
      oThis.cacheKeys[oThis._cacheKeyPrefix() + 'cm_cm_rbi_' + '_' + oThis.ids[ind].toLowerCase()] = oThis.ids[ind];
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
  async fetchDataFromSource(cacheMissIds) {
    const oThis = this;

    const response = await new UserRedemptionModel().fetchByUuids(cacheMissIds);

    return responseHelper.successWithData(response.data);
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

InstanceComposer.registerAsShadowableClass(UserRedemptionsByUuid, coreConstants.icNameSpace, 'UserRedemptionsByUuid');

module.exports = {};
