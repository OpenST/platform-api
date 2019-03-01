'use strict';
/**
 *  Fetch device details by userId and wallet address.
 *
 * @module app/services/device/get/ByAddress
 */
const OSTBase = require('@ostdotcom/base');

const rootPrefix = '../../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  GetDeviceBase = require(rootPrefix + '/app/services/device/get/Base');

const InstanceComposer = OSTBase.InstanceComposer;

/**
 * Class to get devices data by userId and wallet address.
 *
 * @class GetDeviceByAddress
 */
class GetDeviceByAddress extends GetDeviceBase {
  /**
   * Constructor to get devices data by userId and wallet address.
   *
   * @param {String} params.address: Wallet address
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.address = params.address;
  }

  /**
   * Validate and sanitize input parameters.
   *
   * @returns {*}
   *
   * @private
   */
  async _validateAndSanitizeParams() {
    const oThis = this;
    oThis.address = basicHelper.sanitizeAddress(oThis.address);
  }

  /**
   * Set wallet addresses.
   *
   * @private
   */
  async _setWalletAddresses() {
    const oThis = this;

    oThis.walletAddresses = [oThis.address];
  }

  /**
   * Format response
   *
   * @return {*}
   *
   * @private
   */
  _formatApiResponse() {
    const oThis = this;

    let device = oThis.deviceDetails[0];

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
