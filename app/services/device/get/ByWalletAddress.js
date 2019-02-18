'use strict';
/**
 *  Fetch device details by userId and wallet addresses.
 *
 * @module app/services/device/get/ByWalletAddress
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  GetDeviceBase = require(rootPrefix + '/app/services/device/get/Base');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chainMulti/DeviceDetail');

/**
 * Class to get devices data by userId and wallet addresses.
 *
 * @class ByWalletAddress
 */
class ByWalletAddress extends GetDeviceBase {
  /**
   * Constructor to get devices data by userId and wallet addresses.
   *
   * @param {Object} params
   * @param {Integer} params.client_id
   * @param {String} params.user_id: uuid
   * @param {String} params.address: Wallet addresses
   * @param {Integer} [params.token_id]
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
  _sanitizeParams() {
    const oThis = this;

    super._sanitizeParams();

    oThis.address = oThis.address.toLowerCase();
  }

  /**
   * Set wallet addresses.
   *
   * @private
   */
  _setWalletAddresses() {
    const oThis = this;

    oThis.walletAddresses = [oThis.address];
  }

  /**
   * Get user device data from cache.
   *
   * @returns {Promise<*|result>}
   */
  async _getUserDeviceDataFromCache() {
    const oThis = this;

    let DeviceDetailCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'DeviceDetailCache'),
      deviceDetailCache = new DeviceDetailCache({
        userId: oThis.userId,
        tokenId: oThis.tokenId,
        walletAddresses: oThis.walletAddresses
      }),
      response = await deviceDetailCache.fetch();

    if (response.isFailure()) {
      return Promise.reject(response);
    }

    if (!CommonValidators.validateObject(response.data[oThis.address.toLowerCase()])) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_d_g_bwa_1',
          api_error_identifier: 'resource_not_found',
          params_error_identifiers: ['invalid_device_address'],
          debug_options: {}
        })
      );
    }

    return {
      [resultType.device]: response.data[oThis.address.toLowerCase()]
    };
  }
}

InstanceComposer.registerAsShadowableClass(ByWalletAddress, coreConstants.icNameSpace, 'DeviceByWalletAddress');

module.exports = {};
