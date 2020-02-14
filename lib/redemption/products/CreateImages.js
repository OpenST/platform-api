/**
 * Create redemption products.
 *
 * @module lib/redemption/products/CreateImages
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  RedemptionProductModel = require(rootPrefix + '/app/models/mysql/RedemptionProduct'),
  TokenRedemptionProductModel = require(rootPrefix + '/app/models/mysql/TokenRedemptionProduct'),
  RedemptionProductCache = require(rootPrefix + '/lib/cacheManagement/sharedMulti/RedemptionProduct'),
  urlHelper = require(rootPrefix + '/lib/redemption/UrlHelper'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenRedemptionProduct');

class CreateImages {
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
    const oThis = this;

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

    for (let imageSize in oThis.image) {
      if (!urlHelper.imageSizesMap[imageSize]) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'l_r_p_ci_2',
            api_error_identifier: 'something_went_wrong',
            debug_options: { imageSize: imageSize }
          })
        );
      }

      oThis.urlTemplate = urlHelper.longToShortUrl(oThis.image[imageSize].url);

      await oThis._validateRedemptionProductId();

      await oThis._validateTokenRedemptionProductId();
    }
  }

  /**
   * Validate redemption product id.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _validateRedemptionProductId() {
    const oThis = this;

    if (!oThis.redemptionProductId) return;

    const redemptionProductCacheResp = await new RedemptionProductCache({
      ids: [oThis.redemptionProductId]
    }).fetch();

    if (redemptionProductCacheResp.isFailure()) {
      return Promise.reject(redemptionProductCacheResp);
    }

    if (!CommonValidators.validateNonEmptyObject(redemptionProductCacheResp.data[oThis.redemptionProductId])) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_r_p_ci_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: { redemptionProductCacheResp: redemptionProductCacheResp }
        })
      );
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
    const oThis = this,
      imageMap = {};

    imageMap[urlHelper.urlTemplateShortName] = oThis.urlTemplate;
    imageMap[urlHelper.resolutionsShortName] = urlHelper.createShortResolutions(oThis.image);

    if (oThis.redemptionProductId) {
      await new RedemptionProductModel()
        .update({ image: JSON.stringify(imageMap) })
        .where({ id: oThis.redemptionProductId })
        .fire();

      await RedemptionProductModel.flushCache({ ids: [oThis.redemptionProductId] });
    } else if (oThis.tokenRedemptionProductId) {
      await new TokenRedemptionProductModel()
        .update({ image: JSON.stringify(imageMap) })
        .where({ id: oThis.tokenRedemptionProductId })
        .fire();

      await TokenRedemptionProductModel.flushCache({ ids: [oThis.tokenRedemptionProductId] });
    }
  }
}

InstanceComposer.registerAsShadowableClass(CreateImages, coreConstants.icNameSpace, 'CreateImages');

module.exports = CreateImages;
