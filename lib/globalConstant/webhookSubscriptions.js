/**
 * Module for webhook subscription constants.
 *
 * @module lib/globalConstant/webhookSubscriptions
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

let invertedStatuses, invertedTopics;

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
  get transactionsCreateTopic() {
    return 'transactions/create';
  }

  get transactionsSuccessTopic() {
    return 'transactions/success';
  }

  get transactionsFailureTopic() {
    return 'transactions/failure';
  }
  // Transactions topic end.

  // Users topic start.
  get usersActivateTopic() {
    return 'users/activate';
  }

  get usersDeleteTopic() {
    return 'users/delete';
  }
  // Users topic end.

  // Devices topic start.
  get devicesAuthorizedTopic() {
    return 'devices/authorized';
  }

  get devicesUnauthorizedTopic() {
    return 'devices/unauthorized';
  }

  get devicesInitiateRecoveryTopic() {
    return 'devices/initiate_recovery';
  }

  get devicesRecoveryAbortedTopic() {
    return 'devices/recovery_aborted';
  }

  get devicesRecoverySuccessTopic() {
    return 'devices/recovery_success';
  }
  // Devices topic end.

  // Sessions topic start.
  get sessionsCreateTopic() {
    return 'sessions/create';
  }

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

  get statuses() {
    const oThis = this;

    return {
      '1': oThis.activeStatus,
      '2': oThis.inActiveStatus
    };
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

    return {
      '1': oThis.transactionsCreateTopic,
      '2': oThis.transactionsSuccessTopic,
      '3': oThis.transactionsFailureTopic,
      '4': oThis.usersActivateTopic,
      '5': oThis.usersDeleteTopic,
      '6': oThis.devicesAuthorizedTopic,
      '7': oThis.devicesUnauthorizedTopic,
      '8': oThis.devicesInitiateRecoveryTopic,
      '9': oThis.devicesRecoveryAbortedTopic,
      '10': oThis.devicesRecoverySuccessTopic,
      '11': oThis.sessionsCreateTopic,
      '12': oThis.sessionsAuthorizedTopic,
      '13': oThis.sessionsRevokedTopic,
      '14': oThis.sessionsLogoutAllTopic
    };
  }

  get invertedTopics() {
    const oThis = this;

    if (invertedTopics) {
      return invertedTopics;
    }

    invertedTopics = util.invert(oThis.topics);

    return invertedTopics;
  }
}

module.exports = new WebhookSubscriptionsConstants();