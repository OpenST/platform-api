/**
 * Module to delegate entity based on webhookKind.
 *
 * @module lib/webhooks/delegator/Factory
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  userDelegator = require(rootPrefix + '/lib/webhooks/delegator/user'),
  // deviceDelegator = require(rootPrefix + '/lib/webhooks/delegator/device'),
  // sessionDelegator = require(rootPrefix + '/lib/webhooks/delegator/session'),
  // transactionDelegator = require(rootPrefix + '/lib/webhooks/delegator/transaction'),
  ConfigStrategyByClientId = require(rootPrefix + '/helpers/configStrategy/ByClientId'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  webhookSubscriptionsConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions');

/**
 * Class to delegate entity based on webhookKind.
 *
 * @class Factory
 */
class Factory {
  /**
   * Main performer for class.
   *
   * @param {object} payload
   * @param {string} payload.webhookKind
   * @param {string} payload.clientId
   * @param {string} [payload.tokenId]
   *
   * @returns {Promise|*|undefined|Promise<T | never>}
   */
  perform(payload) {
    const oThis = this;

    return oThis._asyncPerform(payload).catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      }
      logger.error('lib/webhooks/delegator/Factory.js::perform::catch');
      logger.error(error);

      return responseHelper.error({
        internal_error_identifier: 'l_w_d_f_1',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: {}
      });
    });
  }

  async _asyncPerform(payload) {
    const oThis = this;

    const ic = await oThis._createConfigStrategy(payload.clientId);

    return oThis._createEntity(payload, ic);
  }

  /**
   * Create config strategy for clientId.
   *
   * @param {number/string} clientId
   *
   * @returns {Promise<void>}
   * @private
   */
  async _createConfigStrategy(clientId) {
    const configStrategyByClientIdObj = new ConfigStrategyByClientId(clientId);

    const configStrategyRsp = await configStrategyByClientIdObj.get();

    return new InstanceComposer(configStrategyRsp.data);
  }

  /**
   * Create entity for payload based on webhookKind.
   *
   * @param {object} payload
   * @param {string} payload.clientId
   * @param {string} payload.webhookKind
   * @param {object} ic
   *
   * @returns {Promise<Promise<*|*|*|*|Promise<never>>|*>}
   * @private
   */
  async _createEntity(payload, ic) {
    const webhookKind = payload.webhookKind;

    switch (webhookKind) {
      case webhookSubscriptionsConstants.transactionsCreateTopic:
      case webhookSubscriptionsConstants.transactionsSuccessTopic:
      case webhookSubscriptionsConstants.transactionsFailureTopic:
        return transactionDelegator.perform(payload, ic);
      case webhookSubscriptionsConstants.usersActivateTopic:
      case webhookSubscriptionsConstants.usersDeleteTopic:
        return userDelegator.perform(payload, ic);
      case webhookSubscriptionsConstants.devicesAuthorizedTopic:
      case webhookSubscriptionsConstants.devicesUnauthorizedTopic:
      case webhookSubscriptionsConstants.devicesInitiateRecoveryTopic:
      case webhookSubscriptionsConstants.devicesRecoveryAbortedTopic:
      case webhookSubscriptionsConstants.devicesRecoverySuccessTopic:
        return new deviceDelegator.perform(payload, ic);
      case webhookSubscriptionsConstants.sessionsCreateTopic:
      case webhookSubscriptionsConstants.sessionsAuthorizedTopic:
      case webhookSubscriptionsConstants.sessionsRevokedTopic:
      case webhookSubscriptionsConstants.sessionsLogoutAllTopic:
        return new sessionDelegator.perform(payload, ic);
      default:
        return Promise.reject(new Error('Invalid webhookKind.'));
    }
  }
}

module.exports = new Factory();
