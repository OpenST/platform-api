/**
 * Module to create device entity.
 *
 * @module lib/webhooks/delegator/device
 */

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  webhookSubscriptionsConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/app/services/device/get/ByAddress');

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
   * @param {string} [payload.deviceAddress]
   * @param {string} [payload.oldDeviceAddress]
   * @param {string} [payload.newDeviceAddress]
   * @param {object} ic
   *
   * @returns {Promise<void>}
   * @private
   */
  async _asyncPerform(payload, ic) {
    let serviceParams = {};

    switch (payload.webhookKind) {
      case webhookSubscriptionsConstants.devicesAuthorizedTopic:
      case webhookSubscriptionsConstants.devicesUnauthorizedTopic:
        serviceParams = {
          client_id: payload.clientId,
          token_id: payload.tokenId,
          user_id: payload.userId,
          device_address: payload.deviceAddress
        };
        break;
      case webhookSubscriptionsConstants.devicesInitiateRecoveryTopic:
      case webhookSubscriptionsConstants.devicesRecoveryAbortedTopic:
      case webhookSubscriptionsConstants.devicesRecoverySuccessTopic:
        serviceParams = {
          client_id: payload.clientId,
          token_id: payload.tokenId,
          user_id: payload.userId,
          device_address: payload.newDeviceAddress
        };
        break;
      default:
        return Promise.reject(new Error('Invalid webhookKind.'));
    }
    const GetDeviceByAddress = ic.getShadowedClassFor(coreConstants.icNameSpace, 'GetDeviceByAddress'),
      getDeviceByAddress = new GetDeviceByAddress(serviceParams);

    const deviceResponse = await getDeviceByAddress.perform();

    return deviceResponse.data[resultType.device];
  }
}

module.exports = new Device();
