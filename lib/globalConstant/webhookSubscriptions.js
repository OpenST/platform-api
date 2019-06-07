/**
 * Module for webhook subscription constants.
 *
 * @module lib/globalConstant/webhookSubscriptions
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

let statuses, invertedStatuses, topics, invertedTopics, webhookQueueTopics;

/**
 * Class for webhook subscriptions constants.
 *
 * @class WebhookSubscriptions
 */
class WebhookSubscriptionsConstants {
  get activeStatus() {
    return 'active';
  }

  get inActiveStatus() {
    return 'inActive';
  }

  // Transactions topic start.
  get transactionsInitiateTopic() {
    return 'transactions/initiate';
  }

  get transactionsSuccessTopic() {
    return 'transactions/success';
  }

  get transactionsFailureTopic() {
    return 'transactions/failure';
  }
  // Transactions topic end.

  // Users topic start.
  get usersActivationInitiateTopic() {
    return 'users/activation_initiate';
  }

  get usersActivationSuccessTopic() {
    return 'users/activation_success';
  }

  get usersActivationFailureTopic() {
    return 'users/activation_failure';
  }
  // Users topic end.

  // Devices topic start.
  get devicesAuthorizationInitiateTopic() {
    return 'devices/authorization_initiate';
  }

  get devicesAuthorizationSuccessTopic() {
    return 'devices/authorization_success';
  }

  get devicesAuthorizationFailureTopic() {
    return 'devices/authorization_failure';
  }

  get devicesRevocationInitiateTopic() {
    return 'devices/revocation_initiate';
  }

  get devicesRevocationSuccessTopic() {
    return 'devices/revocation_success';
  }

  get devicesRevocationFailureTopic() {
    return 'devices/revocation_failure';
  }

  get devicesRecoveryInitiateTopic() {
    return 'devices/recovery_initiate';
  }

  get devicesRecoverySuccessTopic() {
    return 'devices/recovery_success';
  }

  get devicesRecoveryFailureTopic() {
    return 'devices/recovery_failure';
  }

  get devicesRecoveryAbortTopic() {
    return 'devices/recovery_abort';
  }

  // Devices topic end.

  // Sessions topic start.
  get sessionsAuthorizedTopic() {
    return 'sessions/authorized';
  }

  get sessionsRevokedTopic() {
    return 'sessions/revoked';
  }

  get sessionsLogoutAllTopic() {
    return 'sessions/logoutall';
  }
  // Sessions topic end.

  // Webhook queues subscription topic names start.
  get transactionsTopic() {
    return 'transactions';
  }

  get usersTopic() {
    return 'users';
  }

  get devicesTopic() {
    return 'devices';
  }

  get sessionsTopic() {
    return 'sessions';
  }
  // Webhook queues subscription topic names end.

  get statuses() {
    const oThis = this;

    if (statuses) {
      return statuses;
    }

    statuses = {
      '1': oThis.activeStatus,
      '2': oThis.inActiveStatus
    };

    return statuses;
  }

  get invertedStatuses() {
    const oThis = this;

    if (invertedStatuses) {
      return invertedStatuses;
    }

    invertedStatuses = util.invert(oThis.statuses);

    return invertedStatuses;
  }

  get topics() {
    const oThis = this;

    if (topics) {
      return topics;
    }

    topics = {
      '1': oThis.transactionsInitiateTopic,
      '2': oThis.transactionsSuccessTopic,
      '3': oThis.transactionsFailureTopic,
      '4': oThis.usersActivationInitiateTopic,
      '5': oThis.usersActivationSuccessTopic,
      '6': oThis.usersActivationFailureTopic,
      '7': oThis.devicesAuthorizationInitiateTopic,
      '8': oThis.devicesAuthorizationSuccessTopic,
      '9': oThis.devicesAuthorizationFailureTopic,
      '10': oThis.devicesRevocationInitiateTopic,
      '11': oThis.devicesRevocationSuccessTopic,
      '12': oThis.devicesRevocationFailureTopic,
      '13': oThis.devicesRecoveryInitiateTopic,
      '14': oThis.devicesRecoverySuccessTopic,
      '15': oThis.devicesRecoveryFailureTopic,
      '16': oThis.devicesRecoveryAbortTopic,
      '17': oThis.sessionsAuthorizedTopic,
      '18': oThis.sessionsRevokedTopic,
      '19': oThis.sessionsLogoutAllTopic
    };

    return topics;
  }

  get invertedTopics() {
    const oThis = this;

    if (invertedTopics) {
      return invertedTopics;
    }

    invertedTopics = util.invert(oThis.topics);

    return invertedTopics;
  }

  get webhookQueueTopicName() {
    const oThis = this;

    if (webhookQueueTopics) {
      return webhookQueueTopics;
    }

    webhookQueueTopics = {
      [oThis.transactionsInitiateTopic]: oThis.transactionsTopic,
      [oThis.transactionsSuccessTopic]: oThis.transactionsTopic,
      [oThis.transactionsFailureTopic]: oThis.transactionsTopic,
      [oThis.usersActivationInitiateTopic]: oThis.usersTopic,
      [oThis.usersActivationSuccessTopic]: oThis.usersTopic,
      [oThis.usersActivationFailureTopic]: oThis.usersTopic,
      [oThis.devicesAuthorizationInitiateTopic]: oThis.devicesTopic,
      [oThis.devicesAuthorizationSuccessTopic]: oThis.devicesTopic,
      [oThis.devicesAuthorizationFailureTopic]: oThis.devicesTopic,
      [oThis.devicesRevocationInitiateTopic]: oThis.devicesTopic,
      [oThis.devicesRevocationSuccessTopic]: oThis.devicesTopic,
      [oThis.devicesRevocationFailureTopic]: oThis.devicesTopic,
      [oThis.devicesRecoveryInitiateTopic]: oThis.devicesTopic,
      [oThis.devicesRecoverySuccessTopic]: oThis.devicesTopic,
      [oThis.devicesRecoveryFailureTopic]: oThis.devicesTopic,
      [oThis.devicesRecoveryAbortTopic]: oThis.devicesTopic,
      [oThis.sessionsAuthorizedTopic]: oThis.sessionsTopic,
      [oThis.sessionsRevokedTopic]: oThis.sessionsTopic,
      [oThis.sessionsLogoutAllTopic]: oThis.sessionsTopic
    };

    return webhookQueueTopics;
  }
}

module.exports = new WebhookSubscriptionsConstants();
