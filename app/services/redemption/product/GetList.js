const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  paginationConstants = require(rootPrefix + '/lib/globalConstant/pagination'),
  tokenRedemptionProductsConstants = require(rootPrefix + '/lib/globalConstant/tokenRedemptionProducts');

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
   * Constructor to get redemption product list.
   *
   * @param {object} params
   * @param {number} params.client_id
   * @param {number} [params.ids] - filter on ids.
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
    oThis.tokenRedemptionProductIds = params.ids;
    oThis.tokenRedemptionProductDetailsMap = {};

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

    if (oThis.tokenRedemptionProductIds.length === 0) {
      await oThis._fetchTokenRedemptionProductIds();
      oThis._filterProductIds();
    }

    // TODO - redemption - we need to check if the tokenRedemptionProductIds belong to the same token
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

    // TODO - redemption - if ids are present and are more than max limit, then error out.

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

    // TODO - redemption - remove ic for this cache.
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

    // TODO - redemption - change data.productIds to data.redemptionProductIds
    oThis.tokenRedemptionProductIds = response.data.productIds;
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

    const TokenRedemptionProductCache = oThis
      .ic()
      .getShadowedClassFor(coreConstants.icNameSpace, 'TokenRedemptionProductCache');

    // TODO - redemption - ic is not needed for this cache
    // TODO - redemption - change ids to tokenRedemptionProductIds
    const response = await new TokenRedemptionProductCache({
      ids: oThis.tokenRedemptionProductIds
    }).fetch();

    if (response.isFailure()) {
      return Promise.reject(response);
    }

    oThis.tokenRedemptionProductDetailsMap = response.data;
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

      // TODO - if ids in params, then don't check for status. Please refer Notes column in api excel.
      if (tokenRedemptionProduct.status === tokenRedemptionProductsConstants.activeStatus) {
        finalRedemptionProductsArray.push(tokenRedemptionProduct);
      }
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
      [resultType.redeemableSkus]: finalRedemptionProductsArray,
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
