/**
 * Module for webhook subscription to entity statuses constants.
 *
 * @module lib/globalConstant/webhookSubscriptionsToEntityStatuses
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device'),
  sessionConstants = require(rootPrefix + '/lib/globalConstant/session'),
  webhookSubscriptionConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions');

const WebhookSubscriptionsToEntityStatusesMap = {
  [webhookSubscriptionConstants.transactionsInitiateTopic]: [
    pendingTransactionConstants.createdStatus,
    pendingTransactionConstants.submittedStatus
  ],
  [webhookSubscriptionConstants.transactionsFailureTopic]: [pendingTransactionConstants.failedStatus],
  [webhookSubscriptionConstants.transactionsMinedTopic]: [pendingTransactionConstants.minedStatus],
  [webhookSubscriptionConstants.transactionsSuccessTopic]: [pendingTransactionConstants.successStatus],
  [webhookSubscriptionConstants.usersActivationInitiateTopic]: [tokenUserConstants.activatingStatus],
  [webhookSubscriptionConstants.usersActivationSuccessTopic]: [tokenUserConstants.activatedStatus],
  [webhookSubscriptionConstants.usersActivationFailureTopic]: [tokenUserConstants.createdStatus],
  [webhookSubscriptionConstants.devicesAuthorizationInitiateTopic]: [deviceConstants.authorizingStatus],
  [webhookSubscriptionConstants.devicesAuthorizationSuccessTopic]: [deviceConstants.authorizedStatus],
  [webhookSubscriptionConstants.devicesAuthorizationFailureTopic]: [deviceConstants.registeredStatus],
  [webhookSubscriptionConstants.devicesRevocationInitiateTopic]: [deviceConstants.revokingStatus],
  [webhookSubscriptionConstants.devicesRevocationSuccessTopic]: [deviceConstants.revokedStatus],
  [webhookSubscriptionConstants.devicesRevocationFailureTopic]: [deviceConstants.authorizedStatus],
  [webhookSubscriptionConstants.devicesRecoveryInitiateTopic]: [deviceConstants.recoveringStatus],
  [webhookSubscriptionConstants.devicesRecoverySuccessTopic]: [deviceConstants.authorizedStatus],
  [webhookSubscriptionConstants.devicesRecoveryFailureTopic]: [deviceConstants.revokingStatus],
  [webhookSubscriptionConstants.devicesRecoveryAbortSuccessTopic]: [deviceConstants.registeredStatus],
  [webhookSubscriptionConstants.devicesRecoveryAbortFailureTopic]: [deviceConstants.recoveringStatus],
  [webhookSubscriptionConstants.sessionsAuthorizationInitiateTopic]: [sessionConstants.initializingStatus],
  [webhookSubscriptionConstants.sessionsAuthorizationSuccessTopic]: [sessionConstants.authorizedStatus],
  [webhookSubscriptionConstants.sessionsAuthorizationFailureTopic]: [sessionConstants.initializingStatus],
  [webhookSubscriptionConstants.sessionsRevocationInitiateTopic]: [sessionConstants.revokingStatus],
  [webhookSubscriptionConstants.sessionsRevocationSuccessTopic]: [sessionConstants.revokedStatus],
  [webhookSubscriptionConstants.sessionsRevocationFailureTopic]: [sessionConstants.authorizedStatus],
  [webhookSubscriptionConstants.sessionsLogoutAllInitiateTopic]: [tokenUserConstants.tokenHolderLoggingOutStatus],
  [webhookSubscriptionConstants.sessionsLogoutAllSuccessTopic]: [tokenUserConstants.tokenHolderLoggedOutStatus],
  [webhookSubscriptionConstants.sessionsLogoutAllFailureTopic]: [tokenUserConstants.tokenHolderLoggingOutStatus]
};

class WebhookSubscriptionsToEntityStatuses {
  constructor() {}

  /**
   * Fetch valid entity statuses for given webhook topic
   *
   * @param webhookTopic
   * @returns {[*, *]|Array}
   */
  fetchValidEntityStatuses(webhookTopic) {
    const oThis = this;

    return WebhookSubscriptionsToEntityStatusesMap[webhookTopic] || [];
  }

  /**
   * Is provided entity status is valid for given webhook topic
   *
   * @param webhookTopic
   * @param entityStatus
   * @returns {boolean}
   */
  isEntityValid(webhookTopic, entityStatus) {
    const oThis = this;

    const allowedEntityStatuses = oThis.fetchValidEntityStatuses(webhookTopic);

    return allowedEntityStatuses.indexOf(entityStatus) > -1;
  }
}

module.exports = new WebhookSubscriptionsToEntityStatuses();
