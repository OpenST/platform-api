const rootPrefix = '../../..',
  BaseKitSaasMultiCacheManagement = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/Base'),
  RedemptionProductCache = require(rootPrefix + '/lib/cacheManagement/sharedMulti/RedemptionProduct'),
  TokenRedemptionProductModel = require(rootPrefix + '/app/models/mysql/TokenRedemptionProduct'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  cacheManagementConstants = require(rootPrefix + '/lib/globalConstant/cacheManagement');

/**
 * Class to get token redemption product details from cache.
 *
 * @class TokenRedemptionProductCache
 */
class TokenRedemptionProductCache extends BaseKitSaasMultiCacheManagement {
  /**
   * Constructor to get token redemption product details from cache.
   *
   * @param {object} params
   * @param {array<number>} params.tokenRedemptionProductIds
   *
   * @augments CacheManagementSharedMultiBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.tokenRedemptionProductIds = params.tokenRedemptionProductIds;
    oThis.cacheType = cacheManagementConstants.sharedMemcached;

    // Call sub class method to set cache level.
    oThis._setCacheLevel();

    // Call sub class method to set cache keys using params provided.
    oThis._setCacheKeys();

    // Call sub class method to set inverted cache keys using params provided.
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
   * @return {String}
   */
  _setCacheKeys() {
    const oThis = this;

    // It uses shared cache key between company api and saas. Any changes in key here should be synced.
    for (let index = 0; index < oThis.tokenRedemptionProductIds.length; index++) {
      oThis.saasCacheKeys[oThis._saasCacheKeyPrefix() + 'cm_trdp_id_' + oThis.tokenRedemptionProductIds[index]] =
        oThis.tokenRedemptionProductIds[index];
      // NOTE: We are not setting kitCacheKeys here as the cacheLevel is only saasSubEnvLevel.
    }
  }

  /**
   * Set cache expiry.
   *
   * @param {string} [timeDelta]
   *
   * @sets oThis.cacheExpiry
   *
   * @private
   */
  _setCacheExpiry(timeDelta) {
    const oThis = this;

    oThis.cacheExpiry = timeDelta || 24 * 60 * 60; // 1 day
  }

  /**
   * Fetch data from source.
   *
   * @param {array<number>} cacheMissIds
   *
   * @returns {Promise<any>}
   */
  async _fetchDataFromSource(cacheMissIds) {
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
        tokenId: tokenRedemptionProductDetails.tokenId,
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
}

module.exports = TokenRedemptionProductCache;
