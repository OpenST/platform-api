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
  publishToPreProcessor = require(rootPrefix + '/lib/webhooks/publishToPreProcessor'),
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
    const pendingWebhooks = await oThis.fetchEntriesToBeRetried(lockId);

    logger.step('** Processing webhooks.');
    await oThis.retryWebhooks(pendingWebhooks);

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
    const invStatuses = pendingWebhookConstants.invertedStatuses;
    // Select entries to be retried.
    await new PendingWebhookModel()
      .update({ lock_id: lockId })
      .where([
        'lock_id IS NULL AND next_retry_at < ? AND status IN (?)',
        currentTimeInSec,
        [
          invStatuses[pendingWebhookConstants.failedStatus],
          invStatuses[pendingWebhookConstants.dataBuildingFailedStatus]
        ]
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
    // Select entries to be retried.
    const entriesToBeRetried = await new PendingWebhookModel()
      .select('*')
      .where({ lock_id: lockId })
      .fire();

    logger.log(`Retrying ${entriesToBeRetried.length} entries.`);

    return entriesToBeRetried;
  }

  /**
   * Retry all failed webhooks
   *
   * @param pendingWebhooks
   * @returns {Promise<void>}
   */
  async retryWebhooks(pendingWebhooks) {
    const oThis = this;

    let dataBuildingFailedWebhooks = [],
      publishingFailedWebhookIds = [];
    for (let index = 0; index < pendingWebhooks.length; index++) {
      const pendingWebhook = pendingWebhooks[index];
      // If data fetching has failed for webhook
      if (
        pendingWebhook.status ==
        pendingWebhookConstants.invertedStatuses[pendingWebhookConstants.dataBuildingFailedStatus]
      ) {
        dataBuildingFailedWebhooks.push(pendingWebhook);
      } else {
        publishingFailedWebhookIds.push(pendingWebhook.id);
      }
    }

    let promisesArray = [];
    promisesArray.push(oThis._retryPublisherWebhooks(publishingFailedWebhookIds));
    promisesArray.push(oThis._retryDataBuildingFailedWebhooks(dataBuildingFailedWebhooks));
    await Promise.all(promisesArray);
  }

  /**
   * Retry webhooks which have failed during publishing.
   *
   * @param {array} pendingWebhookIds
   *
   * @returns {Promise<void>}
   */
  async _retryPublisherWebhooks(pendingWebhookIds) {
    if (pendingWebhookIds.length <= 0) {
      return;
    }
    const oThis = this;
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
   * Retry webhooks which are in data building failed status
   *
   * @param dataBuildingFailedWebhooks
   * @returns {Promise<void>}
   * @private
   */
  async _retryDataBuildingFailedWebhooks(dataBuildingFailedWebhooks) {
    if (dataBuildingFailedWebhooks.length <= 0) {
      return;
    }

    let promisesArr = [];
    for (let i = 0; i < dataBuildingFailedWebhooks.length; i++) {
      const failedWebhook = dataBuildingFailedWebhooks[i];
      promisesArr.push(oThis._enqueueWebhookPreProcessor(failedWebhook));
    }

    await Promise.all(promisesArr);
  }

  /**
   * Enqueue failed webhook for pre-processor.
   *
   * @param failedWebhook
   * @returns {Promise<void>}
   * @private
   */
  async _enqueueWebhookPreProcessor(failedWebhook) {
    const oThis = this;

    let extraData = JSON.parse(failedWebhook.extra_data);
    extraData.payload = extraData.payload || {};
    extraData.payload.pendingWebhookId = failedWebhook.id;

    await new PendingWebhookModel()
      .update({
        lock_id: null,
        extra_data: JSON.stringify(extraData),
        status: pendingWebhookConstants.invertedStatuses[pendingWebhookConstants.queuedStatus]
      })
      .where({ id: failedWebhook.id })
      .fire();

    if (extraData.payload.chainId) {
      await publishToPreProcessor.perform(extraData.payload.chainId, extraData.payload);
    }
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
