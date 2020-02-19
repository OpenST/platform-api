const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  RedemptionProductCache = require(rootPrefix + '/lib/cacheManagement/sharedMulti/RedemptionProduct'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  paginationConstants = require(rootPrefix + '/lib/globalConstant/pagination');

// Following require(s) for registering into instance composer.
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
   * @augments ServiceBase
   *
   * @constructor
   */
  constructor(params) {
    super();

    const oThis = this;

    oThis.clientId = params.client_id;

    oThis.paginationIdentifier = params[paginationConstants.paginationIdentifierKey];
    oThis.limit = params.limit;
    oThis.tokenRedemptionProductIds = [];
    oThis.tokenRedemptionProductDetailsMap = {};
    oThis.redemptionProductDetailsMap = {};

    oThis.page = null;
    oThis.responseMetaData = {
      [paginationConstants.nextPagePayloadKey]: {}
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
   * Validate and sanitize input parameters.
   *
   * @sets oThis.page, oThis.limit
   *
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
      oThis.limit = oThis.limit || paginationConstants.defaultRedemptionProductListPageSize;
    }

    logger.log('oThis.limit------', oThis.limit);

    await oThis._validatePageSize();
  }

  /**
   * Fetch token redemption product ids.
   *
   * @sets oThis.tokenRedemptionProductIds
   *
   * @returns {Promise<never>}
   * @private
   */
  async _fetchTokenRedemptionProductIds() {
    const oThis = this;

    const TokenRedemptionProductIdsByTokenIdCache = oThis
      .ic()
      .getShadowedClassFor(coreConstants.icNameSpace, 'TokenRedemptionProductIdsByTokenIdCache');

    const tokenRedemptionProductIdsByTokenIdCache = new TokenRedemptionProductIdsByTokenIdCache({
        tokenId: oThis.tokenId
      }),
      response = await tokenRedemptionProductIdsByTokenIdCache.fetch();

    if (response.isFailure()) {
      return Promise.reject(response);
    }

    oThis.tokenRedemptionProductIds = response.data.productIds;
    logger.log('oThis.tokenRedemptionProductIds-----11-----', oThis.tokenRedemptionProductIds);
  }

  /**
   * Filter product ids.
   *
   * @sets oThis.tokenRedemptionProductIds
   *
   * @private
   */
  _filterProductIds() {
    const oThis = this;

    const startPosition = (oThis.page - 1) * oThis.limit,
      offset = startPosition + oThis.limit;

    logger.log('startPosition-----', startPosition);
    logger.log('offset-----', offset);

    oThis.tokenRedemptionProductIds = oThis.tokenRedemptionProductIds.slice(startPosition, offset);
    logger.log('oThis.tokenRedemptionProductIds----22------', oThis.tokenRedemptionProductIds);
  }

  /**
   * Fetch token redemption product.
   *
   * @sets oThis.tokenRedemptionProductDetailsMap
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
      .getShadowedClassFor(coreConstants.icNameSpace, 'TokenRedemptionProductCache');

    const response = await new TokenRedemptionProductCache({
      ids: oThis.tokenRedemptionProductIds
    }).fetch();

    if (response.isFailure()) {
      return Promise.reject(response);
    }

    oThis.tokenRedemptionProductDetailsMap = response.data;

    logger.log('oThis.tokenRedemptionProductDetailsMap------', oThis.tokenRedemptionProductDetailsMap);
  }

  /**
   * Fetch product details from master list.
   *
   * @sets oThis.redemptionProductDetailsMap
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchProductDetailsFromMasterList() {
    const oThis = this;

    const masterListProductIds = [];

    for (const tokenRedemptionProductId in oThis.tokenRedemptionProductDetailsMap) {
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

    logger.log('oThis.redemptionProductDetailsMap------', JSON.stringify(oThis.redemptionProductDetailsMap));
  }

  /**
   * Prepare final response.
   *
   * @returns {*|result}
   * @private
   */
  _prepareResponse() {
    const oThis = this;

    const finalRedemptionProducts = [];

    for (let ind = 0; ind < oThis.tokenRedemptionProductIds.length; ind++) {
      const tokenRedemptionProductId = oThis.tokenRedemptionProductIds[ind],
        tokenRedemptionProductDetails = oThis.tokenRedemptionProductDetailsMap[tokenRedemptionProductId],
        redemptionProductDetails = oThis.redemptionProductDetailsMap[tokenRedemptionProductDetails.redemptionProductId];

      const redemptionProduct = {
        id: tokenRedemptionProductDetails.id,
        name: tokenRedemptionProductDetails.name || redemptionProductDetails.name,
        description: tokenRedemptionProductDetails.description || redemptionProductDetails.description,
        images: tokenRedemptionProductDetails.images || redemptionProductDetails.images,
        status: tokenRedemptionProductDetails.status,
        uts: tokenRedemptionProductDetails.updatedTimestamp
      };
      finalRedemptionProducts.push(redemptionProduct);
    }

    if (oThis.tokenRedemptionProductIds.length >= oThis.limit) {
      oThis.responseMetaData[paginationConstants.nextPagePayloadKey] = {
        [paginationConstants.paginationIdentifierKey]: {
          page: oThis.page + 1,
          limit: oThis.limit
        }
      };
    }

    return responseHelper.successWithData({
      [resultType.redeemableSkus]: finalRedemptionProducts,
      [resultType.meta]: oThis.responseMetaData
    });
  }

  /**
   * Returns default page limit.
   *
   * @returns {number}
   * @private
   */
  _defaultPageLimit() {
    return paginationConstants.defaultRedemptionProductListPageSize;
  }

  /**
   * Returns minimum page limit.
   *
   * @returns {number}
   * @private
   */
  _minPageLimit() {
    return paginationConstants.minRedemptionProductListPageSize;
  }

  /**
   * Returns maximum page limit.
   *
   * @returns {number}
   * @private
   */
  _maxPageLimit() {
    return paginationConstants.maxRedemptionProductListPageSize;
  }

  /**
   * Returns current page limit.
   *
   * @returns {number}
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
