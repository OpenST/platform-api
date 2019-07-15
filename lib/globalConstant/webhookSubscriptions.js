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
  // Devices topic end.

  // Devices recovery topic start.
  get devicesRecoveryInitiateTopic() {
    return 'devices/recovery_initiate';
  }

  get devicesRecoverySuccessTopic() {
    return 'devices/recovery_success';
  }

  get devicesRecoveryFailureTopic() {
    return 'devices/recovery_failure';
  }

  get devicesRecoveryAbortSuccessTopic() {
    return 'devices/recovery_abort_success';
  }

  get devicesRecoveryAbortFailureTopic() {
    return 'devices/recovery_abort_failure';
  }
  // Devices recovery topic end.

  // Sessions topic start.
  get sessionsAuthorizationInitiateTopic() {
    return 'sessions/authorization_initiate';
  }

  get sessionsAuthorizationSuccessTopic() {
    return 'sessions/authorization_success';
  }

  get sessionsAuthorizationFailureTopic() {
    return 'sessions/authorization_failure';
  }

  get sessionsRevocationInitiateTopic() {
    return 'sessions/revocation_initiate';
  }

  get sessionsRevocationSuccessTopic() {
    return 'sessions/revocation_success';
  }

  get sessionsRevocationFailureTopic() {
    return 'sessions/revocation_failure';
  }

  get sessionsLogoutAllInitiateTopic() {
    return 'sessions/logoutall_initiate';
  }

  get sessionsLogoutAllSuccessTopic() {
    return 'sessions/logoutall_success';
  }

  get sessionsLogoutAllFailureTopic() {
    return 'sessions/logoutall_failure';
  }
  // Sessions topic end.

  // Price points updated topic start.
  get usdPricePointUpdatedTopic() {
    return 'pricePoints/usd_update';
  }

  get eurPricePointUpdatedTopic() {
    return 'pricePoints/eur_update';
  }

  get gbpPricePointUpdatedTopic() {
    return 'pricePoints/gbp_update';
  }
  // Price points updated topic end.

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

      '11': oThis.usersActivationInitiateTopic,
      '12': oThis.usersActivationSuccessTopic,
      '13': oThis.usersActivationFailureTopic,

      '21': oThis.devicesAuthorizationInitiateTopic,
      '22': oThis.devicesAuthorizationSuccessTopic,
      '23': oThis.devicesAuthorizationFailureTopic,

      '24': oThis.devicesRevocationInitiateTopic,
      '25': oThis.devicesRevocationSuccessTopic,
      '26': oThis.devicesRevocationFailureTopic,

      '31': oThis.devicesRecoveryInitiateTopic,
      '32': oThis.devicesRecoverySuccessTopic,
      '33': oThis.devicesRecoveryFailureTopic,
      '34': oThis.devicesRecoveryAbortSuccessTopic,
      '35': oThis.devicesRecoveryAbortFailureTopic,

      '51': oThis.sessionsAuthorizationInitiateTopic,
      '52': oThis.sessionsAuthorizationSuccessTopic,
      '53': oThis.sessionsAuthorizationFailureTopic,

      '54': oThis.sessionsRevocationInitiateTopic,
      '55': oThis.sessionsRevocationSuccessTopic,
      '56': oThis.sessionsRevocationFailureTopic,

      '57': oThis.sessionsLogoutAllInitiateTopic,
      '58': oThis.sessionsLogoutAllSuccessTopic,
      '59': oThis.sessionsLogoutAllFailureTopic,

      '61': oThis.usdPricePointUpdatedTopic,
      '62': oThis.eurPricePointUpdatedTopic,
      '63': oThis.gbpPricePointUpdatedTopic
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
      [oThis.devicesRecoveryAbortSuccessTopic]: oThis.devicesTopic,
      [oThis.devicesRecoveryAbortFailureTopic]: oThis.devicesTopic,

      [oThis.sessionsAuthorizationInitiateTopic]: oThis.sessionsTopic,
      [oThis.sessionsAuthorizationSuccessTopic]: oThis.sessionsTopic,
      [oThis.sessionsAuthorizationFailureTopic]: oThis.sessionsTopic,

      [oThis.sessionsRevocationInitiateTopic]: oThis.sessionsTopic,
      [oThis.sessionsRevocationSuccessTopic]: oThis.sessionsTopic,
      [oThis.sessionsRevocationFailureTopic]: oThis.sessionsTopic,

      [oThis.sessionsLogoutAllInitiateTopic]: oThis.sessionsTopic,
      [oThis.sessionsLogoutAllSuccessTopic]: oThis.sessionsTopic,
      [oThis.sessionsLogoutAllFailureTopic]: oThis.sessionsTopic
    };

    return webhookQueueTopics;
  }
}

module.exports = new WebhookSubscriptionsConstants();
