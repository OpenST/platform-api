const rootPrefix = '../../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  TokenRedemptionProductCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/TokenRedemptionProduct'),
  TokenRedemptionProductIdsByTokenIdCache = require(rootPrefix +
    '/lib/cacheManagement/kitSaas/TokenRedemptionProductIdsByTokenId'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  paginationConstants = require(rootPrefix + '/lib/globalConstant/pagination'),
  tokenRedemptionProductsConstants = require(rootPrefix + '/lib/globalConstant/tokenRedemptionProducts');

/**
 * Class to get redemption product list.
 *
 * @class GetRedemptionProductList
 */
class GetRedemptionProductList extends ServiceBase {
  /**
   * Constructor to get redemption product list.
   *
   * @param {object} params
   * @param {number} params.client_id
   * @param {number} [params.redeemable_sku_ids] - filter on redeemable sku ids.
   * @param {number} params.pagination_identifier
   * @param {string} params.limit
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
    oThis.tokenRedemptionProductIds = params.redeemable_sku_ids;
    oThis.tokenRedemptionProductDetailsMap = {};

    oThis.page = null;
    oThis.isFilterPresent = false;
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

    if (oThis.tokenRedemptionProductIds.length === 0) {
      await oThis._fetchTokenRedemptionProductIds();
      oThis._filterProductIds();
    }

    await oThis._fetchTokenRedemptionProductDetails();

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

    // Parameters in paginationIdentifier take higher precedence.
    if (oThis.paginationIdentifier) {
      const parsedPaginationParams = oThis._parsePaginationParams(oThis.paginationIdentifier);
      oThis.page = parsedPaginationParams.page; // Override page.
      oThis.limit = parsedPaginationParams.limit; // Override limit.
      oThis.tokenRedemptionProductIds = [];
    } else {
      oThis.page = 1;
      oThis.limit = oThis.limit || paginationConstants.defaultRedemptionProductListPageSize;
      oThis.tokenRedemptionProductIds = oThis.tokenRedemptionProductIds || [];
    }

    // Validate user ids length
    if (
      oThis.tokenRedemptionProductIds &&
      oThis.tokenRedemptionProductIds.length > paginationConstants.maxRedemptionProductListPageSize
    ) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_rd_p_gbl_1',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['redemption_product_ids_more_than_allowed_limit'],
          debug_options: {
            tokenRedemptionProductIds: oThis.tokenRedemptionProductIds
          }
        })
      );
    }

    console.log(
      'oThis.tokenRedemptionProductIds-----',
      oThis.tokenRedemptionProductIds,
      oThis.tokenRedemptionProductIds.length
    );

    // Check if filtered product ids present.
    if (oThis.tokenRedemptionProductIds.length > 0) {
      oThis.isFilterPresent = true;
    }

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

    const tokenRedemptionProductIdsByTokenIdCacheResponse = await new TokenRedemptionProductIdsByTokenIdCache({
      tokenId: oThis.tokenId
    }).fetch();

    if (tokenRedemptionProductIdsByTokenIdCacheResponse.isFailure()) {
      return Promise.reject(tokenRedemptionProductIdsByTokenIdCacheResponse);
    }

    oThis.tokenRedemptionProductIds = tokenRedemptionProductIdsByTokenIdCacheResponse.data.redemptionProductIds;
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

    oThis.tokenRedemptionProductIds = oThis.tokenRedemptionProductIds.slice(startPosition, offset);
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

    oThis.tokenRedemptionProductIds = [...new Set(oThis.tokenRedemptionProductIds)];

    const tokenRedemptionProductCacheResponse = await new TokenRedemptionProductCache({
      tokenRedemptionProductIds: oThis.tokenRedemptionProductIds
    }).fetch();

    if (tokenRedemptionProductCacheResponse.isFailure()) {
      return Promise.reject(tokenRedemptionProductCacheResponse);
    }

    oThis.tokenRedemptionProductDetailsMap = tokenRedemptionProductCacheResponse.data;
  }

  /**
   * Prepare final response.
   *
   * @returns {*|result}
   * @private
   */
  _prepareResponse() {
    const oThis = this;

    const finalRedemptionProductsArray = [];

    for (let ind = 0; ind < oThis.tokenRedemptionProductIds.length; ind++) {
      const tokenRedemptionProductId = oThis.tokenRedemptionProductIds[ind],
        tokenRedemptionProduct = oThis.tokenRedemptionProductDetailsMap[tokenRedemptionProductId];

      console.log('tokenRedemptionProduct------', tokenRedemptionProduct);

      // If token id from signature is not equal to token redemption table token id.
      if (tokenRedemptionProduct.tokenId != oThis.tokenId) {
        return Promise.reject(
          responseHelper.paramValidationError({
            internal_error_identifier: 'a_s_rd_p_gbl_2',
            api_error_identifier: 'invalid_api_params',
            params_error_identifiers: ['invalid_redemption_product_id'],
            debug_options: {
              tokenId: oThis.tokenId,
              tokenRedemptionProductDetails: tokenRedemptionProduct
            }
          })
        );
      }

      if (oThis.isFilterPresent || tokenRedemptionProduct.status === tokenRedemptionProductsConstants.activeStatus) {
        finalRedemptionProductsArray.push(tokenRedemptionProduct);
      }
    }

    if (!oThis.isFilterPresent && oThis.tokenRedemptionProductIds.length >= oThis.limit) {
      oThis.responseMetaData[paginationConstants.nextPagePayloadKey] = {
        [paginationConstants.paginationIdentifierKey]: {
          page: oThis.page + 1,
          limit: oThis.limit
        }
      };
    }

    return responseHelper.successWithData({
      [resultType.redemptionProducts]: finalRedemptionProductsArray,
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

module.exports = GetRedemptionProductList;
