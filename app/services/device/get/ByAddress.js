/**
 * Module to fetch device details by userId and wallet address.
 *
 * @module app/services/device/get/ByAddress
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  GetDeviceBase = require(rootPrefix + '/app/services/device/get/Base'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

/**
 * Class to fetch device details by userId and wallet address.
 *
 * @class GetDeviceByAddress
 */
class GetDeviceByAddress extends GetDeviceBase {
  /**
   * Constructor to fetch device details by userId and wallet address.
   *
   * @param {object} params
   * @param {number} params.client_id
   * @param {string} params.user_id
   * @param {number} [params.token_id]
   * @param {string} params.device_address: Wallet address
   *
   * @augments GetDeviceBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.address = params.device_address;
  }

  /**
   * Validate and sanitize input parameters.
   *
   * @sets oThis.address
   *
   * @returns {Promise<void>}
   * @private
   */
  async _validateAndSanitizeParams() {
    const oThis = this;

    oThis.address = basicHelper.sanitizeAddress(oThis.address);
  }

  /**
   * Set wallet addresses.
   *
   * @sets oThis.walletAddresses
   * @returns {Promise<void>}
   * @private
   */
  async _setWalletAddresses() {
    const oThis = this;

    oThis.walletAddresses = [oThis.address];
  }

  /**
   * Format API response.
   *
   * @return {*}
   * @private
   */
  _formatApiResponse() {
    const oThis = this;

    const device = oThis.deviceDetails[0];

    if (!CommonValidators.validateObject(device)) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_d_g_ba_1',
          api_error_identifier: 'resource_not_found',
          params_error_identifiers: ['invalid_device_address'],
          debug_options: {}
        })
      );
    }

    return responseHelper.successWithData({
      [resultType.device]: device
    });
  }
}

InstanceComposer.registerAsShadowableClass(GetDeviceByAddress, coreConstants.icNameSpace, 'GetDeviceByAddress');

module.exports = {};
