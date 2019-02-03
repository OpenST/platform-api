'use strict';

/**
 *  Fetch device details by userId and wallet addresses.
 *
 * @module app/services/device/getList/ByWalletAddress
 */
const rootPrefix = '../../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidator = require(rootPrefix + '/lib/validators/Common'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  GetListBase = require(rootPrefix + '/app/services/device/getList/Base');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chainMulti/DeviceDetail');

const InstanceComposer = OSTBase.InstanceComposer;

/**
 * Class to get devices data by userId and wallet addresses.
 *
 * @class ByWalletAddress
 */
class ByWalletAddress extends GetListBase {
  /**
   * @param params
   * @param {Integer} params.client_id
   * @param {String} params.user_id - uuid
   * @param {String} params.address
   * @param {Integer} [params.token_id]
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
   * @private
   */
  _sanitizeParams() {
    const oThis = this,
      addresses = oThis.address.split(',');

    super._sanitizeParams();

    for (let index = 0; index < addresses.length; index++) {
      if (!CommonValidator.validateEthAddress(addresses[index])) {
        return Promise.reject(
          responseHelper.paramValidationError({
            internal_error_identifier: 'a_s_d_gl_bwa_1',
            api_error_identifier: 'invalid_api_params',
            params_error_identifiers: ['invalid_address'],
            debug_options: { address: addresses[index] }
          })
        );
      } else {
        oThis.walletAddresses.push(addresses[index].toLowerCase());
      }
    }
  }
}

InstanceComposer.registerAsShadowableClass(ByWalletAddress, coreConstants.icNameSpace, 'DeviceListByWalletAddress');

module.exports = {};
