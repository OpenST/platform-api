/**
 * Module for webhook subscription to entity statuses constants.
 *
 * @module lib/globalConstant/webhookSubscriptionsToEntityStatuses
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  webhookSubscriptionConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions');

const WebhookSubscriptionsToEntityStatusesMap = {
  [webhookSubscriptionConstants.transactionsInitiateTopic]: [
    pendingTransactionConstants.createdStatus,
    pendingTransactionConstants.submittedStatus
  ],
  [webhookSubscriptionConstants.transactionsFailureTopic]: [pendingTransactionConstants.failedStatus],
  [webhookSubscriptionConstants.transactionsMinedTopic]: [pendingTransactionConstants.minedStatus],
  [webhookSubscriptionConstants.transactionsSuccessTopic]: [pendingTransactionConstants.successStatus]
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
