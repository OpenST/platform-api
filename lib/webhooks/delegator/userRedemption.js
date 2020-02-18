/**
 * Module to create userRedemption raw entity.
 *
 * @module lib/webhooks/delegator/userRedemption
 */

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  webhookSubscriptionConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions'),
  userRedemptionConstants = require(rootPrefix + '/lib/globalConstant/userRedemption'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chainMulti/RedemptionsById');

/**
 * Class to create user entity.
 *
 * @class UserRedemption
 */
class UserRedemption {
  /**
   * Main performer for class.
   *
   * @param {object} payload
   * @param {string} payload.webhookKind
   * @param {string} payload.clientId
   * @param {string} payload.tokenId
   * @param {string} payload.userRedemptionId
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
      logger.error('lib/webhooks/delegator/userRedemption.js::perform::catch');
      logger.error(error);

      return responseHelper.error({
        internal_error_identifier: 'l_w_d_ur_1',
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
   * @param {string} payload.tokenId
   * @param {string} payload.userRedemptionId
   * @param {object} ic
   *
   * @returns {Promise<void>}
   * @private
   */
  async _asyncPerform(payload, ic) {
    const oThis = this;

    const RedemptionsByIdCache = ic.getShadowedClassFor(coreConstants.icNameSpace, 'RedemptionsById');

    const userRedemptionResp = await new RedemptionsByIdCache({
      uuids: [payload.userRedemptionUuid]
    }).fetch();

    const rawEntity = userRedemptionResp.data[payload.userRedemptionUuid];

    await oThis._validateEntityStatus(payload.webhookKind, rawEntity);

    return responseHelper.successWithData({
      entityResultType: resultType.userRedemption,
      rawEntity: rawEntity
    });
  }

  /**
   * Webhook subscription topic to entity statuses map.
   */
  get WebhookTopicToEntityStatusMap() {
    return {
      [webhookSubscriptionConstants.redemptionAcceptedTopic]: [userRedemptionConstants.redemptionAcceptedStatus],
      [webhookSubscriptionConstants.redemptionFailedTopic]: [userRedemptionConstants.redemptionFailedStatus],
      [webhookSubscriptionConstants.redemptionCancelledTopic]: [userRedemptionConstants.redemptionCancelledStatus],
      [webhookSubscriptionConstants.redemptionFulfilledTopic]: [userRedemptionConstants.redemptionFulfilledStatus]
    };
  }

  /**
   * Validate entity status with respect to webhook to be sent.
   *
   * @param webhookKind
   * @param rawEntity
   * @returns {Promise<*>}
   * @private
   */
  async _validateEntityStatus(webhookKind, rawEntity) {
    const oThis = this;

    if (oThis._filteredEntityToSend(webhookKind, rawEntity)) {
      return rawEntity;
    } else {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_w_d_ur_2',
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

  /**
   * Filter Entity which can be sent outside.
   *
   * @param webhookKind
   * @param rawEntity
   * @returns {boolean}
   * @private
   */
  _filteredEntityToSend(webhookKind, rawEntity) {
    const oThis = this;

    const allowedEntityStatuses = oThis.WebhookTopicToEntityStatusMap[webhookKind];

    console.log('----------allowedEntityStatuses--------------', allowedEntityStatuses);
    console.log('----------rawEntity.status--------------', rawEntity.status);
    if (allowedEntityStatuses.indexOf(rawEntity.status) <= -1) {
      return false;
    }
    return true;
  }
}

module.exports = new UserRedemption();