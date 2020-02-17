const rootPrefix = '../../..',
  RedemptionProductCache = require(rootPrefix + '/lib/cacheManagement/sharedMulti/RedemptionProduct'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

class ValidateRedemptionProducts {
  constructor() {}

  /**
   * Validate name.
   *
   * @returns {Promise<never>}
   * @private
   */
  async _validateName(name) {
    if (name && !CommonValidators.validateRedemptionProductName(name)) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'l_r_p_v_1',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_redemption_product_name'],
          debug_options: { name: name }
        })
      );
    }
  }

  /**
   * Validate description.
   *
   * @returns {Promise<never>}
   * @private
   */
  async _validateDescription(description) {
    if (description && description.length > 1000) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'l_r_p_v_2',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_redemption_product_description'],
          debug_options: { description: description }
        })
      );
    }
  }

  /**
   * Validate instructions.
   *
   * @returns {Promise<never>}
   * @private
   */
  async _validateInstructions(instructions) {
    if (instructions && !CommonValidators.validateArray(instructions)) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'l_r_p_v_3',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_redemption_product_instructions'],
          debug_options: { instructions: instructions }
        })
      );
    }
  }

  /**
   * Validate redemption product id.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _validateRedemptionProductId(redemptionProductId) {
    if (!redemptionProductId) return;

    const redemptionProductCacheResp = await new RedemptionProductCache({
      ids: [redemptionProductId]
    }).fetch();

    if (redemptionProductCacheResp.isFailure()) {
      return Promise.reject(redemptionProductCacheResp);
    }

    if (!CommonValidators.validateNonEmptyObject(redemptionProductCacheResp.data[redemptionProductId])) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'l_r_p_v_4',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_redemption_product_id'],
          debug_options: { redemptionProductId: redemptionProductId }
        })
      );
    }
  }
}

module.exports = new ValidateRedemptionProducts();
