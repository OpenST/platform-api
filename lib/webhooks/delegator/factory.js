/**
 * Module to delegate entity based on webhookKind.
 *
 * @module lib/webhooks/delegator/factory
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  ConfigStrategyByClientId = require(rootPrefix + '/helpers/configStrategy/ByClientId'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  userDelegator = require(rootPrefix + '/lib/webhooks/delegator/user'),
  deviceDelegator = require(rootPrefix + '/lib/webhooks/delegator/device'),
  sessionDelegator = require(rootPrefix + '/lib/webhooks/delegator/session'),
  pricePointsDelegator = require(rootPrefix + '/lib/webhooks/delegator/pricePoints'),
  tokenHolderDelegator = require(rootPrefix + '/lib/webhooks/delegator/tokenHolder'),
  transactionDelegator = require(rootPrefix + '/lib/webhooks/delegator/transaction'),
  userRedemptionDelegator = require(rootPrefix + '/lib/webhooks/delegator/userRedemption'),
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
   * @param {string} payload.tokenId
   *
   * @returns {Promise|*|undefined|Promise<T | never>}
   */
  perform(payload) {
    const oThis = this;

    return oThis._asyncPerform(payload).catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      }
      logger.error('lib/webhooks/delegator/factory.js::perform::catch');
      logger.error(error);

      return responseHelper.error({
        internal_error_identifier: 'l_w_d_f_1',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: {}
      });
    });
  }

  /**
   * Async perform.
   *
   * @param {object} payload
   *
   * @returns {Promise<Promise<*|Promise<never>>|*>}
   * @private
   */
  async _asyncPerform(payload) {
    const oThis = this;

    const ic = await oThis._createConfigStrategy(payload.clientId);

    return await oThis._createEntity(payload, ic);
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
      case webhookSubscriptionsConstants.transactionsInitiateTopic:
      case webhookSubscriptionsConstants.transactionsSuccessTopic:
      case webhookSubscriptionsConstants.transactionsFailureTopic:
      case webhookSubscriptionsConstants.transactionsMinedTopic:
        return transactionDelegator.perform(payload, ic);
      case webhookSubscriptionsConstants.usersActivationInitiateTopic:
      case webhookSubscriptionsConstants.usersActivationSuccessTopic:
      case webhookSubscriptionsConstants.usersActivationFailureTopic:
        return userDelegator.perform(payload, ic);
      case webhookSubscriptionsConstants.devicesAuthorizationInitiateTopic:
      case webhookSubscriptionsConstants.devicesAuthorizationSuccessTopic:
      case webhookSubscriptionsConstants.devicesAuthorizationFailureTopic:
      case webhookSubscriptionsConstants.devicesRevocationInitiateTopic:
      case webhookSubscriptionsConstants.devicesRevocationSuccessTopic:
      case webhookSubscriptionsConstants.devicesRevocationFailureTopic:
      case webhookSubscriptionsConstants.devicesRecoveryInitiateTopic:
      case webhookSubscriptionsConstants.devicesRecoverySuccessTopic:
      case webhookSubscriptionsConstants.devicesRecoveryFailureTopic:
      case webhookSubscriptionsConstants.devicesRecoveryAbortSuccessTopic:
      case webhookSubscriptionsConstants.devicesRecoveryAbortFailureTopic:
        return deviceDelegator.perform(payload, ic);
      case webhookSubscriptionsConstants.sessionsAuthorizationInitiateTopic:
      case webhookSubscriptionsConstants.sessionsAuthorizationSuccessTopic:
      case webhookSubscriptionsConstants.sessionsAuthorizationFailureTopic:
      case webhookSubscriptionsConstants.sessionsRevocationInitiateTopic:
      case webhookSubscriptionsConstants.sessionsRevocationSuccessTopic:
      case webhookSubscriptionsConstants.sessionsRevocationFailureTopic:
        return sessionDelegator.perform(payload, ic);
      case webhookSubscriptionsConstants.sessionsLogoutAllInitiateTopic:
      case webhookSubscriptionsConstants.sessionsLogoutAllSuccessTopic:
      case webhookSubscriptionsConstants.sessionsLogoutAllFailureTopic:
        return tokenHolderDelegator.perform(payload, ic);
      case webhookSubscriptionsConstants.usdPricePointUpdatedTopic:
      case webhookSubscriptionsConstants.eurPricePointUpdatedTopic:
      case webhookSubscriptionsConstants.gbpPricePointUpdatedTopic:
        return pricePointsDelegator.perform(payload);
      case webhookSubscriptionsConstants.redemptionInitiatedTopic:
      case webhookSubscriptionsConstants.redemptionAcceptedTopic:
      case webhookSubscriptionsConstants.redemptionFailedTopic:
      case webhookSubscriptionsConstants.redemptionCancelledTopic:
      case webhookSubscriptionsConstants.redemptionFulfilledTopic:
        return userRedemptionDelegator.perform(payload, ic);
      default:
        return Promise.reject(new Error('Invalid webhookKind.'));
    }
  }
}

module.exports = new Factory();
