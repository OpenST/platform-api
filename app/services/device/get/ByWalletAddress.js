'use strict';
/**
 *  Fetch device details by userId and wallet address.
 *
 * @module app/services/device/get/ByWalletAddress
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  GetDeviceListBase = require(rootPrefix + '/app/services/device/get/Base');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chainMulti/DeviceDetail');

/**
 * Class to get devices data by userId and wallet address.
 *
 * @class GetDeviceByAddress
 */
class GetDeviceByAddress extends GetDeviceListBase {
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

    oThis.walletAddresses = [];
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

    if (!CommonValidators.validateObject(response.data[oThis.address])) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_d_g_bwa_1',
          api_error_identifier: 'resource_not_found',
          params_error_identifiers: ['invalid_device_address'],
          debug_options: {}
        })
      );
    }

    let finalResponse = response.data[oThis.address],
      linkedAddressMap = await oThis._fetchLinkedDeviceAddressMap();

    finalResponse.linkedAddress = linkedAddressMap[oThis.address];

    return {
      [resultType.device]: finalResponse
    };
  }
}

InstanceComposer.registerAsShadowableClass(GetDeviceByAddress, coreConstants.icNameSpace, 'GetDeviceByAddress');

module.exports = {};
