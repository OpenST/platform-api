const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  UserRedemptionModel = require(rootPrefix + '/app/models/mysql/UserRedemption'),
  CacheManagementChainMultiBase = require(rootPrefix + '/lib/cacheManagement/chainMulti/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

/**
 * Class for redemption by ids cache.
 *
 * @class UserRedemptionsByUuid
 */
class UserRedemptionsByUuid extends CacheManagementChainMultiBase {
  /**
   * Constructor for redemptions by ids cache.
   *
   * @param {object} params
   * @param {array<number>} params.uuids: redemption uuids
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
      oThis.cacheKeys[oThis._cacheKeyPrefix() + 'cm_cm_rbi_' + oThis.ids[ind].toLowerCase()] = oThis.ids[ind];
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
  async fetchDataFromSource(cacheMissUuids) {
    return new UserRedemptionModel().fetchByUuids(cacheMissUuids);
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
