/**
 * Module to create session entity.
 *
 * @module lib/webhooks/delegator/session
 */

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  sessionConstants = require(rootPrefix + '/lib/globalConstant/session'),
  webhookSubscriptionConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/app/services/session/get/ByAddress');

/**
 * Class to create session entity.
 *
 * @class Session
 */
class Session {
  /**
   * Main performer for class.
   *
   * @param {object} payload
   * @param {string} payload.webhookKind
   * @param {string} payload.clientId
   * @param {string} payload.userId
   * @param {string} payload.tokenId
   * @param {string} payload.sessionAddress
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
      logger.error('lib/webhooks/delegator/session.js::perform::catch');
      logger.error(error);

      return responseHelper.error({
        internal_error_identifier: 'l_w_d_s_1',
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
      [webhookSubscriptionConstants.sessionsAuthorizationInitiateTopic]: [sessionConstants.initializingStatus],
      [webhookSubscriptionConstants.sessionsAuthorizationSuccessTopic]: [sessionConstants.authorizedStatus],
      [webhookSubscriptionConstants.sessionsAuthorizationFailureTopic]: [sessionConstants.initializingStatus],
      [webhookSubscriptionConstants.sessionsRevocationInitiateTopic]: [sessionConstants.revokingStatus],
      [webhookSubscriptionConstants.sessionsRevocationSuccessTopic]: [sessionConstants.revokedStatus],
      [webhookSubscriptionConstants.sessionsRevocationFailureTopic]: [sessionConstants.authorizedStatus]
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
   * @param {string} payload.sessionAddress
   * @param {object} ic
   *
   * @returns {Promise<void>}
   * @private
   */
  async _asyncPerform(payload, ic) {
    const oThis = this;

    if (payload.webhookKind === webhookSubscriptionConstants.sessionsAuthorizationFailureTopic) {
      return responseHelper.successWithData({
        entityResultType: resultType.session,
        rawEntity: {
          userId: payload.userId,
          address: payload.sessionAddress,
          expirationHeight: 0,
          expirationTimestamp: 0,
          spendingLimit: null,
          nonce: 0,
          status: 'INITIALIZING',
          updatedTimestamp: 0
        }
      });
    }

    const GetSessionByAddress = ic.getShadowedClassFor(coreConstants.icNameSpace, 'GetSessionByAddress'),
      getSessionByAddress = new GetSessionByAddress({
        client_id: payload.clientId,
        token_id: payload.tokenId,
        user_id: payload.userId,
        session_address: payload.sessionAddress
      });

    const sessionResponse = await getSessionByAddress.perform();

    const rawEntity = sessionResponse.data[resultType.session];

    await oThis._validateEntityStatus(payload.webhookKind, rawEntity);

    return responseHelper.successWithData({
      entityResultType: resultType.session,
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
          internal_error_identifier: 'l_w_d_s_2',
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

module.exports = new Session();
