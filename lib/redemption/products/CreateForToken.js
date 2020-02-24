/**
 * Create token redemption products.
 *
 * @module lib/redemption/products/CreateForToken
 */

const rootPrefix = '../../..',
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  TokenByTokenIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenByTokenId'),
  TokenRedemptionProductModel = require(rootPrefix + '/app/models/mysql/TokenRedemptionProduct'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  validateRedemptionProducts = require(rootPrefix + '/lib/redemption/products/validate'),
  redemptionProductConstants = require(rootPrefix + '/lib/globalConstant/redemptionProduct');

class CreateTokenRedemptionProducts {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Number} params.tokenId - Token Id
   * @param {Number} params.redemptionProductId - Denomination
   * @param {Object} params.images - Images
   * @param {String} [params.name] - Name of product
   * @param {String} [params.description] - Description of product
   * @param {Number} [params.tokenRedemptionProductId] - Token redemption Product Id
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.tokenId = params.tokenId;
    oThis.redemptionProductId = params.redemptionProductId;
    oThis.images = params.images;
    oThis.name = params.name;
    oThis.description = params.description;

    oThis.tokenRedemptionProductId = params.tokenRedemptionProductId || null;
    oThis.imageMap = {};
  }

  /**
   * Main performer method.
   *
   * @returns {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis._validateAndSanitize();

    await oThis._insertIntoTokenRedemptionProducts();
  }

  /**
   * Validate and sanitize.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _validateAndSanitize() {
    const oThis = this,
      promiseArray = [];

    promiseArray.push(validateRedemptionProducts._validateImage(oThis.images));
    promiseArray.push(validateRedemptionProducts._validateName(oThis.name));
    promiseArray.push(validateRedemptionProducts._validateDescription(oThis.description));
    promiseArray.push(validateRedemptionProducts._validateRedemptionProductId(oThis.redemptionProductId));
    promiseArray.push(oThis._validateTokenId());

    const promiseArrayResponse = await Promise.all(promiseArray);

    oThis.imageMap = promiseArrayResponse[0];
  }

  /**
   * Validate token id.
   *
   * @returns {Promise<never>}
   * @private
   */
  async _validateTokenId() {
    const oThis = this;

    if (!oThis.tokenId && !oThis.tokenRedemptionProductId) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_r_p_cft_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { tokenId: oThis.tokenId }
        })
      );
    }

    if (oThis.tokenId) {
      const tokenCacheResponse = await new TokenByTokenIdCache({
        tokenId: oThis.tokenId
      }).fetch();

      if (tokenCacheResponse.isFailure()) {
        return Promise.reject(tokenCacheResponse);
      }

      if (!CommonValidators.validateNonEmptyObject(tokenCacheResponse.data)) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'l_r_p_cft_2',
            api_error_identifier: 'something_went_wrong',
            debug_options: { tokenCacheResponse: tokenCacheResponse }
          })
        );
      }
    }
  }

  /**
   * Insert into redemption products.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _insertIntoTokenRedemptionProducts() {
    const oThis = this,
      paramsToUpdate = {};

    if (oThis.tokenRedemptionProductId) {
      if (oThis.name) {
        paramsToUpdate['name'] = oThis.name;
      }
      if (oThis.description) {
        paramsToUpdate['description'] = oThis.description;
      }
      if (oThis.images) {
        paramsToUpdate['image'] = JSON.stringify(oThis.imageMap);
      }

      logger.debug('paramsToUpdate ========', paramsToUpdate);

      await new TokenRedemptionProductModel()
        .update(paramsToUpdate)
        .where({ id: oThis.tokenRedemptionProductId })
        .fire();
    } else {
      await new TokenRedemptionProductModel().insertRecord({
        tokenId: oThis.tokenId,
        redemptionProductId: oThis.redemptionProductId,
        image: oThis.imageMap,
        name: oThis.name || null,
        description: oThis.description || null,
        sequenceNumber: Date.now(),
        status: redemptionProductConstants.activeStatus
      });
    }
  }
}

module.exports = CreateTokenRedemptionProducts;
