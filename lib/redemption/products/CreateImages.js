/**
 * Create redemption products.
 *
 * @module lib/redemption/products/CreateImages
 */

const rootPrefix = '../../..',
  RedemptionProductModel = require(rootPrefix + '/app/models/mysql/RedemptionProduct'),
  TokenRedemptionProductModel = require(rootPrefix + '/app/models/mysql/TokenRedemptionProduct'),
  urlHelper = require(rootPrefix + '/lib/redemption/UrlHelper'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

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
    } else if (oThis.tokenRedemptionProductId) {
      await new TokenRedemptionProductModel()
        .update({ image: JSON.stringify(imageMap) })
        .where({ id: oThis.tokenRedemptionProductId })
        .fire();
    }
  }
}

module.exports = CreateImages;
