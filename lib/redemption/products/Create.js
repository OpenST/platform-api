/**
 * Create redemption products.
 *
 * @module lib/redemption/Create
 */

const rootPrefix = '../../..',
  RedemptionProductModel = require(rootPrefix + '/app/models/mysql/RedemptionProduct'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  validateRedemptionProducts = require(rootPrefix + '/lib/redemption/products/validate'),
  redemptionProductConstants = require(rootPrefix + '/lib/globalConstant/redemptionProduct');

class CreateRedemptionProducts {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {String} params.name - Name of product
   * @param {String} params.description - Description of product
   * @param {Object} params.images - Images
   * @param {Number} [params.redemptionProductId] - Redemption Product Id
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.name = params.name;
    oThis.description = params.description;
    oThis.redemptionProductId = params.redemptionProductId || null;
    oThis.images = params.images;

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

    await oThis._insertUpdateRedemptionProducts();
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

    const promiseArrayResponse = await Promise.all(promiseArray);

    oThis.imageMap = promiseArrayResponse[0];
  }

  /**
   * Insert or update redemption products.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _insertUpdateRedemptionProducts() {
    const oThis = this,
      paramsToUpdate = {};

    if (oThis.redemptionProductId) {
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

      await new RedemptionProductModel()
        .update(paramsToUpdate)
        .where({ id: oThis.redemptionProductId })
        .fire();
    } else {
      const insertionResponse = await new RedemptionProductModel().insertRecord({
        name: oThis.name,
        description: oThis.description,
        image: oThis.imageMap,
        status: redemptionProductConstants.activeStatus
      });
      oThis.redemptionProductId = insertionResponse.data;
    }

    // Flush cache.
    await RedemptionProductModel.flushCache({ ids: [oThis.redemptionProductId] });
  }
}

module.exports = CreateRedemptionProducts;
