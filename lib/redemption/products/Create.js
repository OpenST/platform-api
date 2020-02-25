/**
 * Create redemption products.
 *
 * @module lib/redemption/Create
 */

const rootPrefix = '../../..',
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  RedemptionProductModel = require(rootPrefix + '/app/models/mysql/RedemptionProduct'),
  TokenRedemptionProductModel = require(rootPrefix + '/app/models/mysql/TokenRedemptionProduct'),
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
    oThis.images = params.images || null;

    oThis.imageMap = null;
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

    if (CommonValidators.validateObject(promiseArrayResponse[0])) {
      oThis.imageMap = promiseArrayResponse[0];
    }
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
      if (CommonValidators.validateObject(oThis.imageMap)) {
        paramsToUpdate['image'] = JSON.stringify(oThis.imageMap);
      }

      logger.debug('paramsToUpdate ========', paramsToUpdate);

      await new RedemptionProductModel()
        .update(paramsToUpdate)
        .where({ id: oThis.redemptionProductId })
        .fire();
    } else {
      const insertParams = {
        name: oThis.name,
        description: oThis.description,
        status: redemptionProductConstants.activeStatus
      };

      if (oThis.imageMap) {
        insertParams.image = oThis.imageMap;
      }

      const insertionResponse = await new RedemptionProductModel().insertRecord(insertParams);
      oThis.redemptionProductId = insertionResponse.data;
    }

    // Flush cache.
    const tokenRedemptionProductDbRows = await new TokenRedemptionProductModel()
        .select('*')
        .where({ redemption_product_id: oThis.redemptionProductId })
        .fire(),
      tokenRedemptionProductIds = [],
      promiseArray = [];

    for (let i = 0; i < tokenRedemptionProductDbRows.length; i++) {
      tokenRedemptionProductIds.push(Number(tokenRedemptionProductDbRows[i].id));
    }

    // NOTE: Here we will need to flush cache for token redemption product because it caches redemption products data.
    if (tokenRedemptionProductIds.length > 0) {
      promiseArray.push(TokenRedemptionProductModel.flushCache({ ids: tokenRedemptionProductIds }));
    }

    promiseArray.push(RedemptionProductModel.flushCache({ ids: [oThis.redemptionProductId] }));

    await Promise.all(promiseArray);
  }
}

module.exports = CreateRedemptionProducts;
