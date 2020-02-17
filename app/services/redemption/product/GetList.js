/**
 * Api to get single redemption product list.
 *
 * @module app/services/redemption/product/GetList
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  RedemptionProductCache = require(rootPrefix + '/lib/cacheManagement/sharedMulti/RedemptionProduct'),
  pagination = require(rootPrefix + '/lib/globalConstant/pagination'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenRedemptionProduct');
require(rootPrefix + '/lib/cacheManagement/chain/TokenRedemptionProductIdsByTokenId');

/**
 * Class to get redemption product list.
 *
 * @class GetRedemptionProductList
 */
class GetRedemptionProductList extends ServiceBase {
  /**
   * Constructor to fetch user redemption list
   *
   * @param {object} params
   * @param {number} params.client_id
   * @param {number} params.pagination_identifier
   * @param {string} params.limit
   * @param {string} params.status
   *
   * @constructor
   */
  constructor(params) {
    super(params);
    const oThis = this;

    oThis.clientId = params.client_id;

    oThis.paginationIdentifier = params[pagination.paginationIdentifierKey];
    oThis.limit = params.limit;
    oThis.tokenRedemptionProductIds = [];
    oThis.tokenRedemptionProductDetailsMap = {};
    oThis.redemptionProductDetailsMap = {};

    oThis.page = null;
    oThis.responseMetaData = {
      [pagination.nextPagePayloadKey]: {}
    };
  }

  /**
   * Async perform.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._validateAndSanitizeParams();

    await oThis._validateTokenStatus();

    await oThis._fetchTokenRedemptionProductIds();

    oThis._filterProductIds();

    await oThis._fetchTokenRedemptionProductDetails();

    await oThis._fetchProductDetailsFromMasterList();

    return oThis._prepareResponse();
  }

  /**
   * Sets pagination params
   * @returns {Promise}
   * @private
   */
  async _validateAndSanitizeParams() {
    const oThis = this;

    // Parameters in paginationIdentifier take higher precedence
    if (oThis.paginationIdentifier) {
      const parsedPaginationParams = oThis._parsePaginationParams(oThis.paginationIdentifier);
      oThis.page = parsedPaginationParams.page; // Override page
      oThis.limit = parsedPaginationParams.limit; // Override limit
    } else {
      oThis.page = 1;
      oThis.limit = oThis.limit || pagination.defaultRedemptionProductListPageSize;
    }

    console.log('oThis.limit------', oThis.limit);

    await oThis._validatePageSize();
  }

  /**
   * Fetch token redemption product ids.
   *
   * @returns {Promise<never>}
   * @private
   */
  async _fetchTokenRedemptionProductIds() {
    const oThis = this;

    const TokenRedemptionProductIdsByTokenIdCache = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'TokenRedemptionProductIdsByTokenIdCache'),
      tokenRedemptionProductIdsByTokenIdCache = new TokenRedemptionProductIdsByTokenIdCache({
        tokenId: oThis.tokenId
      }),
      response = await tokenRedemptionProductIdsByTokenIdCache.fetch();

    if (response.isFailure()) {
      return Promise.reject(response);
    }

    oThis.tokenRedemptionProductIds = response.data.productIds;
    console.log('oThis.tokenRedemptionProductIds-----11-----', oThis.tokenRedemptionProductIds);
  }

  /**
   * Filter product ids.
   *
   * @private
   */
  _filterProductIds() {
    const oThis = this;

    const startPosition = (oThis.page - 1) * oThis.limit,
      offset = startPosition + oThis.limit;

    console.log('startPosition-----', startPosition);
    console.log('offset-----', offset);

    oThis.tokenRedemptionProductIds = oThis.tokenRedemptionProductIds.slice(startPosition, offset);
    console.log('oThis.tokenRedemptionProductIds----22------', oThis.tokenRedemptionProductIds);
  }

  /**
   * Fetch token redemption product.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchTokenRedemptionProductDetails() {
    const oThis = this;

    if (oThis.tokenRedemptionProductIds.length === 0) {
      return;
    }

    const TokenRedemptionProductCache = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'TokenRedemptionProductCache'),
      tokenRedemptionProductCache = new TokenRedemptionProductCache({
        ids: oThis.tokenRedemptionProductIds
      }),
      response = await tokenRedemptionProductCache.fetch();

    if (response.isFailure()) {
      return Promise.reject(response);
    }

    oThis.tokenRedemptionProductDetailsMap = response.data;

    console.log('oThis.tokenRedemptionProductDetailsMap------', oThis.tokenRedemptionProductDetailsMap);
  }

  /**
   * Fetch product details from master list.
   *
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchProductDetailsFromMasterList() {
    const oThis = this;

    let masterListProductIds = [];

    for (let tokenRedemptionProductId in oThis.tokenRedemptionProductDetailsMap) {
      const tokenRedemptionProduct = oThis.tokenRedemptionProductDetailsMap[tokenRedemptionProductId];
      masterListProductIds.push(tokenRedemptionProduct.redemptionProductId);
    }

    if (masterListProductIds.length === 0) {
      return;
    }

    const redemptionProductCacheRsp = await new RedemptionProductCache({ ids: masterListProductIds }).fetch();

    if (redemptionProductCacheRsp.isFailure()) {
      return Promise.reject(redemptionProductCacheRsp);
    }

    oThis.redemptionProductDetailsMap = redemptionProductCacheRsp.data;

    console.log('oThis.redemptionProductDetailsMap------', oThis.redemptionProductDetailsMap);
  }

  /**
   * Prepare final response.
   *
   * @private
   */
  _prepareResponse() {
    const oThis = this;

    const finalRedemptionProducts = [];

    for (let ind = 0; ind < oThis.tokenRedemptionProductIds.length; ind++) {
      let tokenRedemptionProductId = oThis.tokenRedemptionProductIds[ind],
        tokenRedemptionProductDetails = oThis.tokenRedemptionProductDetailsMap[tokenRedemptionProductId],
        redemptionProductDetails = oThis.redemptionProductDetailsMap[tokenRedemptionProductDetails.redemptionProductId];

      const redemptionProduct = {
        id: tokenRedemptionProductDetails.id,
        name: tokenRedemptionProductDetails.name || redemptionProductDetails.name,
        description: tokenRedemptionProductDetails.description || redemptionProductDetails.description,
        image: tokenRedemptionProductDetails.image || redemptionProductDetails.image,
        denomination: tokenRedemptionProductDetails.denomination || redemptionProductDetails.denomination,
        expiryInDays: tokenRedemptionProductDetails.expiryInDays || redemptionProductDetails.expiryInDays,
        status: tokenRedemptionProductDetails.status || redemptionProductDetails.status,
        uts: tokenRedemptionProductDetails.updatedTimestamp || redemptionProductDetails.updatedTimestamp
      };
      finalRedemptionProducts.push(redemptionProduct);
    }

    if (oThis.tokenRedemptionProductIds.length >= oThis.limit) {
      oThis.responseMetaData[pagination.nextPagePayloadKey] = {
        [pagination.paginationIdentifierKey]: {
          page: oThis.page + 1,
          limit: oThis.limit
        }
      };
    }

    return responseHelper.successWithData({
      [resultType.redeemableSku]: finalRedemptionProducts,
      [resultType.meta]: oThis.responseMetaData
    });
  }

  /**
   * _defaultPageLimit
   *
   * @private
   */
  _defaultPageLimit() {
    return pagination.defaultRedemptionProductListPageSize;
  }

  /**
   * _minPageLimit
   *
   * @private
   */
  _minPageLimit() {
    return pagination.minRedemptionProductListPageSize;
  }

  /**
   * _maxPageLimit
   *
   * @private
   */
  _maxPageLimit() {
    return pagination.maxRedemptionProductListPageSize;
  }

  /**
   * _currentPageLimit
   *
   * @private
   */
  _currentPageLimit() {
    const oThis = this;

    return oThis.limit;
  }
}

InstanceComposer.registerAsShadowableClass(
  GetRedemptionProductList,
  coreConstants.icNameSpace,
  'GetRedemptionProductList'
);

module.exports = {};
