/**
 * Module for pending webhook constants.
 *
 * @module lib/globalConstant/pendingWebhook
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

let statuses, invertedStatuses;

/**
 * Class for pending webhook constants.
 *
 * @class PendingWebhookConstants
 */
class PendingWebhookConstants {
  // NOTE: Here the topics in pending webhooks are same as that of webhook subscriptions topic so we will use the same.

  // Status constants starts.
  get queuedStatus() {
    return 'queued';
  }

  get inProgressStatus() {
    return 'inProgress';
  }

  get completedStatus() {
    return 'completed';
  }

  get failedStatus() {
    return 'failed';
  }

  get completelyFailedStatus() {
    return 'completelyFailed';
  }
  // Status constants ends.

  get statuses() {
    const oThis = this;

    if (statuses) {
      return statuses;
    }

    statuses = {
      '1': oThis.queuedStatus,
      '2': oThis.inProgressStatus,
      '3': oThis.completedStatus,
      '4': oThis.failedStatus,
      '5': oThis.completelyFailedStatus
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

  get oneHourInSeconds() {
    return 3600;
  }

  get maxRetryCount() {
    return 25;
  }

  get retryCountToNextRetryAtMap() {
    const oThis = this;

    return {
      0: 60,
      1: 300,
      [oThis.maxRetryCount]: false
    };
  }
}

module.exports = new PendingWebhookConstants();
