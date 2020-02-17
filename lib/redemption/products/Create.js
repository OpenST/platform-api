/**
 * Create redemption products.
 *
 * @module lib/redemption/Create
 */

const rootPrefix = '../../..',
  RedemptionProductModel = require(rootPrefix + '/app/models/mysql/RedemptionProduct'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
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
   * @param {Object} params.image - Images
   * @param {Object} params.denomination - Denomination
   * @param {Number} [params.redemptionProductId] - Redemption Product Id
   * @param {Number} [params.expiryInDays] - Expiry in days
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.name = params.name;
    oThis.description = params.description;
    oThis.denomination = params.denomination;
    oThis.expiryInDays = params.expiryInDays;

    oThis.redemptionProductId = params.redemptionProductId || null;
  }

  /**
   * Main performer method.
   *
   * @returns {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis._validateAndSanitize();

    await oThis._insertIntoRedemptionProducts();
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

    promiseArray.push(validateRedemptionProducts._validateName(oThis.name));
    promiseArray.push(validateRedemptionProducts._validateDescription(oThis.description));
    promiseArray.push(validateRedemptionProducts._validateRedemptionProductId(oThis.redemptionProductId));

    promiseArray.push(oThis._validateDenomination());

    await Promise.all(promiseArray);
  }

  /**
   * Validate denomination.
   *
   * @returns {Promise<never>}
   * @private
   */
  _validateDenomination() {
    const oThis = this;

    for (let currency in oThis.denomination) {
      if (!redemptionProductConstants.allowedDenominationCurrencies[currency]) {
        return Promise.reject(
          responseHelper.paramValidationError({
            internal_error_identifier: 'l_r_p_c_1',
            api_error_identifier: 'invalid_api_params',
            params_error_identifiers: ['invalid_redemption_product_denomination'],
            debug_options: { currency: currency }
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
  async _insertIntoRedemptionProducts() {
    const oThis = this,
      paramsToUpdate = {};

    if (oThis.redemptionProductId) {
      if (oThis.name) {
        paramsToUpdate['name'] = oThis.name;
      }
      if (oThis.description) {
        paramsToUpdate['description'] = oThis.description;
      }
      if (oThis.denomination) {
        paramsToUpdate['denomination'] = oThis.denomination;
      }
      if (oThis.expiryInDays) {
        paramsToUpdate['expiryInDays'] = oThis.expiryInDays;
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
        denomination: oThis.denomination,
        expiry_in_days: oThis.expiryInDays,
        status: redemptionProductConstants.activeStatus
      });

      oThis.redemptionProductId = insertionResponse.data.insertId;
    }

    // Flush cache.
    await RedemptionProductModel.flushCache({ ids: [oThis.redemptionProductId] });
  }
}

module.exports = CreateRedemptionProducts;
