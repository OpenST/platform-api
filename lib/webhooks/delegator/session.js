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

    return responseHelper.successWithData({
      entityResultType: resultType.session,
      rawEntity: sessionResponse.data[resultType.session]
    });
  }
}

module.exports = new Session();
