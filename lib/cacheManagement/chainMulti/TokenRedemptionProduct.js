const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  CacheManagementChainMultiBase = require(rootPrefix + '/lib/cacheManagement/chainMulti/Base'),
  RedemptionProductCache = require(rootPrefix + '/lib/cacheManagement/sharedMulti/RedemptionProduct'),
  TokenRedemptionProductModel = require(rootPrefix + '/app/models/mysql/TokenRedemptionProduct'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  cacheManagementConstants = require(rootPrefix + '/lib/globalConstant/cacheManagement');

/**
 * Class to get token redemption product details from cache.
 *
 * @class TokenRedemptionProductCache
 */
class TokenRedemptionProductCache extends CacheManagementChainMultiBase {
  /**
   * Constructor to get token redemption product details from cache.
   *
   * @param {object} params
   * @param {array<number>} params.ids
   *
   * @augments CacheManagementSharedMultiBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.ids = params.ids;

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

    oThis.cacheLevel = cacheManagementConstants.saasSubEnvLevel;
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

    for (let index = 0; index < oThis.ids.length; index++) {
      oThis.cacheKeys[oThis._cacheKeyPrefix() + 'c_trdp_id_' + oThis.ids[index]] = oThis.ids[index];
    }
  }

  /**
   * Set cache expiry.
   *
   * @sets oThis.cacheExpiry
   */
  _setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 1 * 24 * 60 * 60; // 1 days;
  }

  /**
   * Fetch data from source.
   *
   * @param {array<number>} cacheMissIds
   *
   * @returns {Promise<any>}
   */
  async fetchDataFromSource(cacheMissIds) {
    const fetchTokenRedemptionProductsByIdsRsp = await new TokenRedemptionProductModel().fetchTokenRedemptionProductsByIds(
      cacheMissIds
    );

    const masterListProductIds = [],
      tokenRedemptionProductIds = fetchTokenRedemptionProductsByIdsRsp.data.redemptionProductIds,
      tokenRedemptionProductDetailsMap = fetchTokenRedemptionProductsByIdsRsp.data.redemptionProductMap;

    for (const tokenRedemptionProductId in tokenRedemptionProductDetailsMap) {
      const tokenRedemptionProduct = tokenRedemptionProductDetailsMap[tokenRedemptionProductId];
      masterListProductIds.push(tokenRedemptionProduct.redemptionProductId);
    }

    const redemptionProductCacheRsp = await new RedemptionProductCache({ ids: masterListProductIds }).fetch();

    if (redemptionProductCacheRsp.isFailure()) {
      return Promise.reject(redemptionProductCacheRsp);
    }

    const redemptionProductDetailsMap = redemptionProductCacheRsp.data,
      finalRedemptionProductsMap = {};

    for (let ind = 0; ind < tokenRedemptionProductIds.length; ind++) {
      const tokenRedemptionProductId = tokenRedemptionProductIds[ind],
        tokenRedemptionProductDetails = tokenRedemptionProductDetailsMap[tokenRedemptionProductId],
        redemptionProductDetails = redemptionProductDetailsMap[tokenRedemptionProductDetails.redemptionProductId];

      const redemptionProduct = {
        id: tokenRedemptionProductDetails.id,
        redemptionProductId: tokenRedemptionProductDetails.redemptionProductId,
        name: tokenRedemptionProductDetails.name || redemptionProductDetails.name,
        description: tokenRedemptionProductDetails.description || redemptionProductDetails.description,
        images: tokenRedemptionProductDetails.images || redemptionProductDetails.images,
        status: tokenRedemptionProductDetails.status,
        uts: tokenRedemptionProductDetails.updatedTimestamp
      };

      finalRedemptionProductsMap[tokenRedemptionProductId] = redemptionProduct;
    }

    return responseHelper.successWithData(finalRedemptionProductsMap);
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

InstanceComposer.registerAsShadowableClass(
  TokenRedemptionProductCache,
  coreConstants.icNameSpace,
  'TokenRedemptionProductCache'
);

module.exports = {};
