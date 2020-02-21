const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  RedemptionCountryModel = require(rootPrefix + '/app/models/mysql/Country'),
  UserRedemptionModel = require(rootPrefix + '/app/models/mysql/UserRedemption'),
  CacheManagementChainMultiBase = require(rootPrefix + '/lib/cacheManagement/chainMulti/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  cacheManagementConstants = require(rootPrefix + '/lib/globalConstant/cacheManagement');

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

    // Call sub class method to set cache level.
    oThis._setCacheLevel();

    // Call sub class method to set cache key using params provided.
    oThis._setCacheKeys();

    oThis._setInvertedCacheKeys();

    // Call sub class method to set cache expiry using params provided.
    oThis._setCacheExpiry();

    // Call sub class method to set cache implementer using params provided.
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

    oThis.cacheLevel = cacheManagementConstants.saasSubEnvLevel;
  }

  /**
   * Set cache key.
   *
   * @sets oThis.cacheKeys
   *
   * @private
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
   *
   * @private
   */
  _setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 3 * 24 * 60 * 60; // 72 hours ;
  }

  /**
   * Fetch data from source.
   *
   * @return {Promise<result>}
   */
  async fetchDataFromSource(cacheMissUuids) {
    const redemptionsResponse = await new UserRedemptionModel().fetchByUuids(cacheMissUuids),
      redemptions = redemptionsResponse.data,
      countryIds = [];

    if (!CommonValidators.validateObject(redemptions)) {
      return responseHelper.successWithData(redemptions);
    }

    for (const uuid in redemptions) {
      countryIds.push(redemptions[uuid].countryId);
    }

    const countryDetailsResp = await new RedemptionCountryModel().getDetailsByCountryId(countryIds),
      countryDetails = countryDetailsResp.data;

    for (const uuid in redemptions) {
      const red = redemptions[uuid],
        country = countryDetails[red.countryId];

      red.countryIsoCode = country.countryIsoCode;
      red.currencyIsoCode = country.currencyIsoCode;
    }

    return responseHelper.successWithData(redemptions);
  }

  /**
   * Validate data to set.
   *
   * @param {object} dataToSet
   *
   * @returns {*}
   */
  validateDataToSet(dataToSet) {
    return dataToSet;
  }
}

InstanceComposer.registerAsShadowableClass(UserRedemptionsByUuid, coreConstants.icNameSpace, 'UserRedemptionsByUuid');

module.exports = {};
