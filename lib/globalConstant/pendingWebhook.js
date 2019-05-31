/**
 * Module for pending webhook constants.
 *
 * @module lib/globalConstant/pendingWebhook
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

let invertedStatuses;

/**
 * Class for pending webhook constants.
 *
 * @class PendingWebhookConstants
 */
class PendingWebhookConstants {
  // NOTE: Here the topics in pending webhooks are same as that
  // of webhook subscriptions topic so we will use the same.

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

    return {
      '1': oThis.queuedStatus,
      '2': oThis.inProgressStatus,
      '3': oThis.completedStatus,
      '4': oThis.failedStatus,
      '5': oThis.completelyFailedStatus
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
}

module.exports = new PendingWebhookConstants();
