/**
 * Create redemption products.
 *
 * @module lib/redemption/products/CreateImagesForRedemption
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  RedemptionProductModel = require(rootPrefix + '/app/models/mysql/RedemptionProduct'),
  TokenRedemptionProductModel = require(rootPrefix + '/app/models/mysql/TokenRedemptionProduct'),
  urlHelper = require(rootPrefix + '/lib/redemption/UrlHelper'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  validateRedemptionProducts = require(rootPrefix + '/lib/redemption/products/validate');

require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenRedemptionProduct');

class CreateImagesForRedemption {
  /**
   * Constructor
   *
   * @param {Object} params.image - Images
   * @param {Number} [params.redemptionProductId] - Redemption Product Id
   * @param {Number} [params.tokenRedemptionProductId] - Token Redemption Product Id
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.image = params.image;
    oThis.redemptionProductId = params.redemptionProductId;
    oThis.tokenRedemptionProductId = params.tokenRedemptionProductId;

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

    await oThis._insertImages();
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

    if (!oThis.redemptionProductId && !oThis.tokenRedemptionProductId) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_r_p_ci_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            redemptionProductId: oThis.redemptionProductId,
            tokenRedemptionProductId: oThis.tokenRedemptionProductId
          }
        })
      );
    }

    promiseArray.push(oThis._validateImage());
    promiseArray.push(validateRedemptionProducts._validateRedemptionProductId(oThis.redemptionProductId));
    promiseArray.push(oThis._validateTokenRedemptionProductId());

    await Promise.all(promiseArray);
  }

  /**
   * Validate image.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _validateImage() {
    const oThis = this;

    for (let purpose in oThis.image) {
      if (!urlHelper.availablePurposeForImages[purpose]) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'l_r_p_ci_2',
            api_error_identifier: 'something_went_wrong',
            debug_options: { imagePurpose: purpose }
          })
        );
      }

      oThis.imageMap[purpose] = {};

      const imageMapOfPurpose = oThis.image[purpose];

      let urlTemplate = null;

      for (let size in imageMapOfPurpose) {
        if (!urlHelper.imageSizesMap[size]) {
          return Promise.reject(
            responseHelper.error({
              internal_error_identifier: 'l_r_p_ci_3',
              api_error_identifier: 'something_went_wrong',
              debug_options: { imageSize: size }
            })
          );
        }

        urlTemplate = urlHelper.longToShortUrl(imageMapOfPurpose[size].url);
      }
      oThis.imageMap[purpose][urlHelper.resolutionsShortName] = urlHelper.createShortResolutions(oThis.image[purpose]);
      oThis.imageMap[purpose][urlHelper.urlTemplateShortName] = urlTemplate;
    }
  }

  /**
   * Validate token redemption product id.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _validateTokenRedemptionProductId() {
    const oThis = this;

    if (!oThis.tokenRedemptionProductId) return;

    const TokenRedemptionProductCache = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'TokenRedemptionProductCache'),
      tokenRedemptionProductCache = new TokenRedemptionProductCache({
        ids: [oThis.tokenRedemptionProductId]
      }),
      tokenRedemptionProductCacheResp = await tokenRedemptionProductCache.fetch();

    if (tokenRedemptionProductCacheResp.isFailure()) {
      return Promise.reject(tokenRedemptionProductCacheResp);
    }

    if (
      !CommonValidators.validateNonEmptyObject(tokenRedemptionProductCacheResp.data[oThis.tokenRedemptionProductId])
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_r_p_ci_4',
          api_error_identifier: 'something_went_wrong',
          debug_options: { tokenRedemptionProductCacheResp: tokenRedemptionProductCacheResp }
        })
      );
    }
  }

  /**
   * Insert images.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _insertImages() {
    const oThis = this;

    if (oThis.redemptionProductId) {
      await new RedemptionProductModel()
        .update({ image: JSON.stringify(oThis.imageMap) })
        .where({ id: oThis.redemptionProductId })
        .fire();

      await RedemptionProductModel.flushCache({ ids: [oThis.redemptionProductId] });
    } else if (oThis.tokenRedemptionProductId) {
      await new TokenRedemptionProductModel()
        .update({ image: JSON.stringify(oThis.imageMap) })
        .where({ id: oThis.tokenRedemptionProductId })
        .fire();

      await TokenRedemptionProductModel.flushCache({ ids: [oThis.tokenRedemptionProductId] });
    }
  }
}

InstanceComposer.registerAsShadowableClass(
  CreateImagesForRedemption,
  coreConstants.icNameSpace,
  'CreateImagesForRedemption'
);

module.exports = {};
