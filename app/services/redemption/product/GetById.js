/**
 * Api to get single redemption product by id.
 *
 * @module app/services/redemption/product/GetById
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  RedemptionProductCache = require(rootPrefix + '/lib/cacheManagement/sharedMulti/RedemptionProduct'),
  tokenRedemptionProductsConstants = require(rootPrefix + '/lib/globalConstant/tokenRedemptionProducts'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenRedemptionProduct');

/**
 * Class to get redemption product by id.
 *
 * @class GetRedemptionProductById
 */
class GetRedemptionProductById extends ServiceBase {
  /**
   * Constructor to get redemption product by id.
   *
   * @param {object} params
   * @param {number} params.client_id: client Id
   * @param {number} params.redemption_product_id: Token Redemption Product table Id
   *
   * @augments GetUserBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.tokenRedemptionProductId = params.redemption_product_id;

    oThis.tokenRedemptionProductDetails = {};
    oThis.redemptionProductDetails = {};
  }

  /**
   * Main performer for the class.
   *
   * @return {Promise<void>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._fetchTokenDetails();

    await oThis._fetchTokenRedemptionProductDetails();

    await oThis._fetchProductDetailsFromMasterList();

    return oThis._prepareResponse();
  }

  /**
   * Fetch token redemption product.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchTokenRedemptionProductDetails() {
    const oThis = this;

    const TokenRedemptionProductCache = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'TokenRedemptionProductCache'),
      tokenRedemptionProductCache = new TokenRedemptionProductCache({
        ids: [oThis.tokenRedemptionProductId]
      }),
      response = await tokenRedemptionProductCache.fetch();

    if (response.isFailure()) {
      return Promise.reject(response);
    }

    if (!CommonValidators.validateObject(response.data[oThis.tokenRedemptionProductId])) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_rd_p_gbd_1',
          api_error_identifier: 'resource_not_found',
          params_error_identifiers: ['invalid_redemption_product_id'],
          debug_options: {}
        })
      );
    }

    oThis.tokenRedemptionProductDetails = response.data[oThis.tokenRedemptionProductId];

    // If token id from signature is not equal to token redemption table.
    if (oThis.tokenRedemptionProductDetails.tokenId !== oThis.tokenId) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_rd_p_gbd_2',
          api_error_identifier: 'resource_not_found',
          params_error_identifiers: ['invalid_token_id'],
          debug_options: {}
        })
      );
    }

    if (oThis.tokenRedemptionProductDetails.status !== tokenRedemptionProductsConstants.activeStatus) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_rd_p_gbd_3',
          api_error_identifier: 'resource_not_found',
          params_error_identifiers: ['invalid_token_id'],
          debug_options: {}
        })
      );
    }
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

    const masterListProductId = oThis.tokenRedemptionProductDetails.redemptionProductId,
      redemptionProductCacheRsp = await new RedemptionProductCache({ ids: [masterListProductId] }).fetch();

    if (redemptionProductCacheRsp.isFailure()) {
      return Promise.reject(redemptionProductCacheRsp);
    }

    if (!CommonValidators.validateObject(redemptionProductCacheRsp.data[masterListProductId])) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_rd_p_gbd_4',
          api_error_identifier: 'resource_not_found',
          params_error_identifiers: ['invalid_redemption_product_id'],
          debug_options: {}
        })
      );
    }

    oThis.redemptionProductDetails = redemptionProductCacheRsp.data[masterListProductId];
  }

  /**
   * Prepare final response.
   *
   * @private
   */
  _prepareResponse() {
    const oThis = this;

    const finalRedemptionProductDetails = {
      id: oThis.tokenRedemptionProductDetails.id,
      name: oThis.tokenRedemptionProductDetails.name || oThis.redemptionProductDetails.name,
      description: oThis.tokenRedemptionProductDetails.description || oThis.redemptionProductDetails.description,
      images: oThis.tokenRedemptionProductDetails.images || oThis.redemptionProductDetails.images,
      denominations: oThis.tokenRedemptionProductDetails.denominations || oThis.redemptionProductDetails.denominations,
      expiryInDays: oThis.tokenRedemptionProductDetails.expiryInDays || oThis.redemptionProductDetails.expiryInDays,
      status: oThis.tokenRedemptionProductDetails.status || oThis.redemptionProductDetails.status,
      uts: oThis.tokenRedemptionProductDetails.uts || oThis.redemptionProductDetails.uts
    };

    return responseHelper.successWithData({
      [resultType.redeemableSku]: finalRedemptionProductDetails
    });
  }
}

InstanceComposer.registerAsShadowableClass(
  GetRedemptionProductById,
  coreConstants.icNameSpace,
  'GetRedemptionProductById'
);

module.exports = {};
