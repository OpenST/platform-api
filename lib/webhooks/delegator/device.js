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
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device'),
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
   * Webhook subscription topic to entity statuses map.
   */
  get WebhookTopicToEntityStatusMap() {
    return {
      [webhookSubscriptionsConstants.devicesAuthorizationInitiateTopic]: [deviceConstants.authorizingStatus],
      [webhookSubscriptionsConstants.devicesAuthorizationSuccessTopic]: [deviceConstants.authorizedStatus],
      [webhookSubscriptionsConstants.devicesAuthorizationFailureTopic]: [deviceConstants.registeredStatus],
      [webhookSubscriptionsConstants.devicesRevocationInitiateTopic]: [deviceConstants.revokingStatus],
      [webhookSubscriptionsConstants.devicesRevocationSuccessTopic]: [deviceConstants.revokedStatus],
      [webhookSubscriptionsConstants.devicesRevocationFailureTopic]: [deviceConstants.authorizedStatus],
      [webhookSubscriptionsConstants.devicesRecoveryInitiateTopic]: [deviceConstants.recoveringStatus],
      [webhookSubscriptionsConstants.devicesRecoverySuccessTopic]: [deviceConstants.authorizedStatus],
      [webhookSubscriptionsConstants.devicesRecoveryFailureTopic]: [deviceConstants.revokingStatus],
      [webhookSubscriptionsConstants.devicesRecoveryAbortSuccessTopic]: [deviceConstants.registeredStatus],
      [webhookSubscriptionsConstants.devicesRecoveryAbortFailureTopic]: [deviceConstants.recoveringStatus]
    };
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
    const oThis = this;
    let serviceParams = {};

    switch (payload.webhookKind) {
      case webhookSubscriptionsConstants.devicesAuthorizationInitiateTopic:
      case webhookSubscriptionsConstants.devicesAuthorizationSuccessTopic:
      case webhookSubscriptionsConstants.devicesAuthorizationFailureTopic:
      case webhookSubscriptionsConstants.devicesRevocationInitiateTopic:
      case webhookSubscriptionsConstants.devicesRevocationSuccessTopic:
      case webhookSubscriptionsConstants.devicesRevocationFailureTopic:
        serviceParams = {
          client_id: payload.clientId,
          token_id: payload.tokenId,
          user_id: payload.userId,
          device_address: payload.deviceAddress
        };
        break;
      case webhookSubscriptionsConstants.devicesRecoveryInitiateTopic:
      case webhookSubscriptionsConstants.devicesRecoverySuccessTopic:
      case webhookSubscriptionsConstants.devicesRecoveryFailureTopic:
      case webhookSubscriptionsConstants.devicesRecoveryAbortSuccessTopic:
      case webhookSubscriptionsConstants.devicesRecoveryAbortFailureTopic:
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

    const rawEntity = deviceResponse.data[resultType.device];

    await oThis._validateEntityStatus(payload.webhookKind, rawEntity);

    return responseHelper.successWithData({
      entityResultType: resultType.device,
      rawEntity: rawEntity
    });
  }

  /**
   * Validate entity status with respect to webhook to be sent.
   *
   * @param webhookKind
   * @param rawEntity
   * @returns {Promise<never>}
   * @private
   */
  async _validateEntityStatus(webhookKind, rawEntity) {
    const oThis = this;

    const allowedEntityStatuses = oThis.WebhookTopicToEntityStatusMap[webhookKind];
    if (allowedEntityStatuses.indexOf(rawEntity.status) <= -1) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_w_d_d_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            msg: 'Webhook Kind to send is not in sync with entity data.',
            entityData: rawEntity,
            webhookKind: webhookKind
          }
        })
      );
    }
  }
}

module.exports = new Device();
