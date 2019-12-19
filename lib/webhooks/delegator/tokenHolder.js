/**
 * Module to create tokenHolder entity.
 *
 * @module lib/webhooks/delegator/tokenHolder
 */

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  webhookSubscriptionConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/app/services/user/GetTokenHolder');

/**
 * Class to create tokenHolder entity.
 *
 * @class TokenHolder
 */
class TokenHolder {
  /**
   * Main performer for class.
   *
   * @param {object} payload
   * @param {string} payload.webhookKind
   * @param {string} payload.clientId
   * @param {string} payload.userId
   * @param {string} payload.tokenId
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
      logger.error('lib/webhooks/delegator/tokenHolder.js::perform::catch');
      logger.error(error);

      return responseHelper.error({
        internal_error_identifier: 'l_w_d_th_1',
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
   * @param {object} ic
   *
   * @returns {Promise<void>}
   * @private
   */
  async _asyncPerform(payload, ic) {
    const oThis = this;

    const GetTokenHolder = ic.getShadowedClassFor(coreConstants.icNameSpace, 'GetTokenHolder'),
      getTokenHolder = new GetTokenHolder({
        client_id: payload.clientId,
        token_id: payload.tokenId,
        user_id: payload.userId
      });

    const tokenHolderResponse = await getTokenHolder.perform();

    const rawEntity = tokenHolderResponse.data[resultType.tokenHolder];

    await oThis._validateEntityStatus(payload.webhookKind, rawEntity);

    return responseHelper.successWithData({
      entityResultType: resultType.tokenHolder,
      rawEntity: rawEntity
    });
  }

  /**
   * Webhook subscription topic to entity statuses map.
   */
  get WebhookTopicToEntityStatusMap() {
    return {
      [webhookSubscriptionConstants.sessionsLogoutAllInitiateTopic]: [tokenUserConstants.tokenHolderLoggingOutStatus],
      [webhookSubscriptionConstants.sessionsLogoutAllSuccessTopic]: [tokenUserConstants.tokenHolderLoggedOutStatus],
      [webhookSubscriptionConstants.sessionsLogoutAllFailureTopic]: [tokenUserConstants.tokenHolderLoggingOutStatus]
    };
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
    if (allowedEntityStatuses.indexOf(rawEntity.tokenHolderStatus) <= -1) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_w_d_th_2',
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

module.exports = new TokenHolder();
