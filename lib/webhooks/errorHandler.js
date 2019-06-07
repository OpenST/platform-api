/**
 * Module for handling failed webhooks.
 *
 * @module lib/webhooks/errorHandler
 */

const rootPrefix = '../..',
  PublishWebhook = require(rootPrefix + '/lib/webhooks/PublishWebhook'),
  PendingWebhookModel = require(rootPrefix + '/app/models/mysql/PendingWebhook'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  pendingWebhookConstants = require(rootPrefix + '/lib/globalConstant/pendingWebhook');

// Declare variables.
const BATCH_SIZE = 50;

/**
 * Class for handling failed webhooks.
 *
 * @class WebhookErrorHandler
 */
class WebhookErrorHandler {
  /**
   * Main performer for class.
   *
   * @param {string} cronProcessId
   *
   * @returns {Promise<void>}
   */
  async perform(cronProcessId) {
    const oThis = this;

    const lockIdResponse = oThis._setLockId(cronProcessId);

    const lockId = lockIdResponse.lockId,
      currentTimeInSec = lockIdResponse.currentTimeInSec;

    logger.step('** Acquiring lock.');
    await oThis.assignLockToEntriesToBeRetried(lockId, currentTimeInSec);

    logger.step('** Getting webhooks to process.');
    const pendingWebhookIds = await oThis.fetchEntriesToBeRetried(lockId);

    logger.step('** Processing webhooks.');
    await oThis.retryWebhooks(pendingWebhookIds);

    logger.step('** Releasing lock.');
    await oThis.releasePendingWebhooksLock(lockId);
  }

  /**
   * Get lock id.
   *
   * @param {string} cronProcessId
   *
   * @returns {{lockId: number, currentTimeInSec: number}}
   * @private
   */
  _setLockId(cronProcessId) {
    const currentTimeMs = new Date().getTime(),
      randomNumber = basicHelper.getRandomNumber(10000000000000, 99999999999999),
      // NOTE: as we have prefetch > 1 it is very IMPORTANT to add this random no. here
      // To avoid same lock id being used for multiple queries
      lockIdPrefix = currentTimeMs + randomNumber;

    return {
      lockId: parseFloat(lockIdPrefix + '.' + cronProcessId),
      currentTimeInSec: parseInt(currentTimeMs / 1000)
    };
  }

  /**
   * Assign lock to entries to be retried.
   *
   * @param {number} lockId
   * @param {number} currentTimeInSec
   *
   * @returns {Promise<void>}
   */
  async assignLockToEntriesToBeRetried(lockId, currentTimeInSec) {
    // Select entries to be retried.
    await new PendingWebhookModel()
      .update({ lock_id: lockId })
      .where([
        'lock_id IS NULL AND next_retry_at < ? AND status = ?',
        currentTimeInSec,
        pendingWebhookConstants.invertedStatuses[pendingWebhookConstants.failedStatus]
      ])
      .limit(BATCH_SIZE)
      .fire();
  }

  /**
   * Fetch entries to be retried.
   *
   * @param {number} lockId
   *
   * @returns {Promise<array>}
   */
  async fetchEntriesToBeRetried(lockId) {
    const pendingWebhookIds = [];

    // Select entries to be retried.
    const entriesToBeRetried = await new PendingWebhookModel()
      .select('id')
      .where({ lock_id: lockId })
      .fire();

    for (let index = 0; index < entriesToBeRetried.length; index++) {
      const entry = entriesToBeRetried[index];

      pendingWebhookIds.push(entry.id);
    }

    return pendingWebhookIds;
  }

  /**
   * Retry webhooks.
   *
   * @param {array} pendingWebhookIds
   *
   * @returns {Promise<void>}
   */
  async retryWebhooks(pendingWebhookIds) {
    const promisesArray = [];
    const pendingWebhookIdsArrayLength = pendingWebhookIds.length;

    for (let index = 0; index < pendingWebhookIdsArrayLength; index++) {
      promisesArray.push(
        new PublishWebhook({ pendingWebhookId: pendingWebhookIds[index], retryWebhook: true }).perform()
      );
    }

    await Promise.all(promisesArray);
  }

  /**
   * Release lock on pending webhooks table. This method is just a safety net.
   *
   * @param {number} lockId
   *
   * @returns {Promise<void>}
   */
  async releasePendingWebhooksLock(lockId) {
    await new PendingWebhookModel()
      .update({ lock_id: null })
      .where({ lock_id: lockId })
      .fire();

    logger.debug('Locks released on webhooks to be retried.');
  }
}

module.exports = new WebhookErrorHandler();
