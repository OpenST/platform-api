/**
 * Module to fetch device details by userId and wallet addresses.
 *
 * @module app/services/device/get/Base
 */

const rootPrefix = '../../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chainMulti/DeviceDetail');
require(rootPrefix + '/lib/cacheManagement/chain/PreviousOwnersMap');

/**
 * Class to fetch device details by userId and wallet addresses.
 *
 * @class GetDeviceBase
 */
class GetDeviceBase extends ServiceBase {
  /**
   * Constructor to fetch device details by userId and wallet addresses.
   *
   * @param {object} params
   * @param {number} params.client_id
   * @param {string} params.user_id
   * @param {number} [params.token_id]
   *
   * @augments ServiceBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.userId = params.user_id;
    oThis.tokenId = params.token_id;

    oThis.walletAddresses = [];
    oThis.deviceDetails = [];
  }

  /**
   * Async perform.
   *
   * @returns {Promise<*|result>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._validateAndSanitizeParams();

    await oThis._validateTokenStatus();

    await oThis._setWalletAddresses();

    await oThis._fetchDevicesExtendedDetails();

    return oThis._formatApiResponse();
  }

  /**
   * Get user device extended details.
   *
   * @returns {Promise<*|result>}
   * @private
   */
  async _fetchDevicesExtendedDetails() {
    const oThis = this;

    const response = await oThis._fetchDevicesFromCache(),
      devices = response.data,
      linkedAddressesMap = await oThis._fetchLinkedDeviceAddressMap();

    for (const index in oThis.walletAddresses) {
      const deviceAddr = oThis.walletAddresses[index],
        device = devices[deviceAddr];

      if (!CommonValidators.validateObject(device)) {
        continue;
      }
      device.linkedAddress = linkedAddressesMap[device.walletAddress];
      oThis.deviceDetails.push(device);
    }
  }

  /**
   * Get devices from cache.
   *
   * @returns {Promise<*|result>}
   * @private
   */
  async _fetchDevicesFromCache() {
    const oThis = this;

    const DeviceDetailCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'DeviceDetailCache'),
      deviceDetailCache = new DeviceDetailCache({
        userId: oThis.userId,
        tokenId: oThis.tokenId,
        walletAddresses: oThis.walletAddresses
      }),
      response = await deviceDetailCache.fetch();

    if (response.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_d_g_b_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return response;
  }

  /**
   * Fetch linked device addresses for specified user id.
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchLinkedDeviceAddressMap() {
    const oThis = this;

    const PreviousOwnersMapCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'PreviousOwnersMap'),
      previousOwnersMapObj = new PreviousOwnersMapCache({ userId: oThis.userId, tokenId: oThis.tokenId }),
      previousOwnersMapRsp = await previousOwnersMapObj.fetch();

    if (previousOwnersMapRsp.isFailure()) {
      logger.error('Error in fetching linked addresses');

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_d_g_b_2',
          api_error_identifier: 'cache_issue',
          debug_options: {}
        })
      );
    }

    return previousOwnersMapRsp.data;
  }

  /**
   * Validate and sanitize params.
   *
   * @return {Promise<void>}
   * @private
   */
  async _validateAndSanitizeParams() {
    throw new Error('Sub-class to implement.');
  }

  /**
   * Set wallet addresses.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _setWalletAddresses() {
    throw new Error('Sub-class to implement.');
  }

  /**
   * Format API response.
   *
   * @return {Promise<void>}
   * @private
   */
  async _formatApiResponse() {
    throw new Error('Sub-class to implement.');
  }
}

module.exports = GetDeviceBase;
