/**
 * Create redemption products.
 *
 * @module lib/redemption/Create
 */

const rootPrefix = '../../..',
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  RedemptionProductModel = require(rootPrefix + '/app/models/mysql/RedemptionProduct'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
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
   * @param {Number} [params.expiryInDays] - Expiry in days
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.name = params.name;
    oThis.description = params.description;
    oThis.denomination = params.denomination;
    oThis.expiryInDays = params.expiryInDays || redemptionProductConstants.defaultExpiryInDays();
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
    const oThis = this;

    if (!CommonValidators.validateRedemptionProductName(oThis.name)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_r_cp_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { name: oThis.name }
        })
      );
    }

    if (oThis.description.length > 1000) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_r_cp_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: { description: oThis.description }
        })
      );
    }

    for (let currency in oThis.denomination) {
      if (!redemptionProductConstants.allowedDenominationCurrencies[currency]) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'l_r_cp_3',
            api_error_identifier: 'something_went_wrong',
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
    const oThis = this;

    await new RedemptionProductModel().insertRecord({
      name: oThis.name,
      description: oThis.description,
      denomination: oThis.denomination,
      expiry_in_days: oThis.expiryInDays,
      status: redemptionProductConstants.activeStatus
    });
  }
}

module.exports = CreateRedemptionProducts;
