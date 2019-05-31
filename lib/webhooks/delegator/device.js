/**
 * Module to create device entity.
 *
 * @module lib/webhooks/delegator/device
 */

const rootPrefix = '../../..',
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  DeviceFormatter = require(rootPrefix + '/lib/formatter/entity/Device'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chainMulti/DeviceDetail');
require(rootPrefix + '/lib/cacheManagement/chain/PreviousOwnersMap');

/**
 * Class to create device entity.
 *
 * @class Device
 */
class Device {
  /**
   * Main performer for class.
   *
   * @param {object} payload
   * @param {string} payload.webhookKind
   * @param {string} payload.clientId
   * @param {string} payload.userId
   * @param {string} payload.tokenId
   * @param {string} payload.deviceAddress
   * @param {object} ic
   *
   * @returns {Promise|*|undefined|Promise<T | never>}
   */
  perform(payload, ic) {
    const oThis = this;

    return oThis._asyncPerform(payload, ic).catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      }
      logger.error('lib/webhooks/delegator/device.js::perform::catch');
      logger.error(error);

      return responseHelper.error({
        internal_error_identifier: 'l_w_d_d_1',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: {}
      });
    });
  }

  /**
   * Async perform.
   *
   * @param {object} payload
   * @param {string} payload.webhookKind
   * @param {string} payload.clientId
   * @param {string} payload.userId
   * @param {string} payload.tokenId
   * @param {string} payload.deviceAddress
   * @param {object} ic
   *
   * @returns {Promise<void>}
   * @private
   */
  async _asyncPerform(payload, ic) {
    const oThis = this;

    const deviceData = await oThis._fetchDeviceDetails(payload, ic);

    return oThis.formatDeviceData(deviceData);
  }

  /**
   * Fetch device data from cache.
   *
   * @param {object} payload
   * @param {string} payload.webhookKind
   * @param {string} payload.clientId
   * @param {string} payload.userId
   * @param {string} payload.tokenId
   * @param {string} payload.deviceAddress
   * @param {object} ic
   *
   * @returns {Promise<*|Promise<Promise<never>|*>>}
   * @private
   */
  async _fetchDevicesFromCache(payload, ic) {
    const DeviceDetailCache = ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeviceDetailCache'),
      deviceDetailCache = new DeviceDetailCache({
        userId: payload.userId,
        tokenId: payload.tokenId,
        walletAddresses: [payload.deviceAddress]
      }),
      response = await deviceDetailCache.fetch();

    if (response.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_w_d_d_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return response.data;
  }

  /**
   * Fetch linked devices addresses for specified userId.
   *
   * @param {object} payload
   * @param {string} payload.webhookKind
   * @param {string} payload.clientId
   * @param {string} payload.userId
   * @param {string} payload.tokenId
   * @param {string} payload.deviceAddress
   * @param {object} ic
   *
   * @returns {Promise<*|Promise<Promise<never>|*>>}
   * @private
   */
  async _fetchLinkedDeviceAddressMap(payload, ic) {
    const PreviousOwnersMapCache = ic.getShadowedClassFor(coreConstants.icNameSpace, 'PreviousOwnersMap'),
      previousOwnersMapObj = new PreviousOwnersMapCache({ userId: payload.userId, tokenId: payload.tokenId }),
      previousOwnersMapRsp = await previousOwnersMapObj.fetch();

    if (previousOwnersMapRsp.isFailure()) {
      logger.error('Error in fetching linked addresses.');

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_w_d_d_3',
          api_error_identifier: 'cache_issue',
          debug_options: {}
        })
      );
    }

    return previousOwnersMapRsp.data;
  }

  /**
   * Fetch device details.
   *
   * @param {object} payload
   * @param {string} payload.webhookKind
   * @param {string} payload.clientId
   * @param {string} payload.userId
   * @param {string} payload.tokenId
   * @param {string} payload.deviceAddress
   * @param {object} ic
   *
   * @returns {Promise<*|Promise<Promise<never>|*>>}
   * @private
   */
  async _fetchDeviceDetails(payload, ic) {
    const oThis = this;

    const promisesArray = [];

    promisesArray.push(oThis._fetchDevicesFromCache(payload, ic));
    promisesArray.push(oThis._fetchLinkedDeviceAddressMap(payload, ic));

    const promisesResponse = await Promise.all(promisesArray);

    const deviceData = promisesResponse[0][payload.deviceAddress];
    const linkedAddressesMap = promisesResponse[1];

    if (!CommonValidators.validateObject(deviceData)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_w_d_d_4',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    deviceData.linkedAddress = linkedAddressesMap[payload.deviceAddress];

    return deviceData;
  }

  /**
   * Format device data using device entity formatter.
   *
   * @param {object} deviceData
   *
   * @returns {*|result}
   */
  formatDeviceData(deviceData) {
    const deviceFormattedRsp = new DeviceFormatter(deviceData).perform();

    return responseHelper.successWithData({
      result_type: resultType.device,
      [resultType.device]: deviceFormattedRsp.data
    });
  }
}

module.exports = new Device();
