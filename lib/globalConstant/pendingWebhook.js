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

  get dataBuildingFailedStatus() {
    return 'dataBuildingFailed';
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
      '5': oThis.completelyFailedStatus,
      '6': oThis.dataBuildingFailedStatus
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

  get oneHourRetryTimeInSeconds() {
    return 3600;
  }

  get maxDataBuildingFailedRetryCount() {
    return 30;
  }

  get maxRetryCount() {
    return 26;
  }

  get retryCountToNextRetryAtMap() {
    return {
      0: 60,
      1: 300
    };
  }

  /**
   * Get next retry at delta time.
   *
   * @param {number} count
   *
   * @returns {number|*}
   */
  getNextRetryAtDelta(count) {
    const oThis = this;

    if (oThis.retryCountToNextRetryAtMap[count]) {
      return oThis.retryCountToNextRetryAtMap[count];
    }

    return oThis.oneHourRetryTimeInSeconds;
  }
}

module.exports = new PendingWebhookConstants();
