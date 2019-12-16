/**
 * Module for pending webhooks model.
 *
 * @module app/models/mysql/PendingWebhook
 */

const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

// Declare variables.
const dbName = 'saas_big_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

/**
 * Class for pending webhooks model.
 *
 * @class PendingWebhook
 */
class PendingWebhook extends ModelBase {
  /**
   * Constructor for pending webhooks model.
   *
   * @augments ModelBase
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'pending_webhooks';
  }

  /**
   * Inserts record.
   *
   * @param {object} params
   * @param {number} params.clientId: client id
   * @param {string} params.eventUuid: event uuid (uuid v4)
   * @param {number} params.webhookTopicKind: webhook topic kind
   * @param {number} params.nextRetryAt: Next retry at
   * @param {number} params.retryCount: Retry count
   * @param {number} params.status: status
   * @param {string} [params.extraData]: extra data
   *
   * @returns {Promise<object>}
   */
  async insertRecord(params) {
    const oThis = this;

    // Perform validations.
    if (
      !params.hasOwnProperty('clientId') ||
      !params.hasOwnProperty('eventUuid') ||
      !params.hasOwnProperty('webhookTopicKind') ||
      !params.hasOwnProperty('status')
    ) {
      throw new Error(
        'Mandatory parameters are missing. Expected an object with the following keys: {clientId, chainId, groupId, status}'
      );
    }

    const time = new Date();

    const insertParams = {
      client_id: params.clientId,
      event_uuid: params.eventUuid,
      webhook_topic_kind: params.webhookTopicKind,
      extra_data: params.extraData || null,
      status: params.status,
      retry_count: params.retryCount || 0,
      lock_id: null,
      next_retry_at: params.nextRetryAt || 0,
      created_at: time
    };

    const insertResponse = await oThis.insert(insertParams).fire();

    // Set pending webhooks cache.
    const cacheParams = {
      clientId: insertParams.client_id,
      eventUuid: insertParams.event_uuid,
      webhookTopicKind: insertParams.webhook_topic_kind,
      extraData: JSON.parse(insertParams.extra_data),
      status: insertParams.status,
      retryCount: insertParams.retry_count,
      lockId: insertParams.lock_id,
      nextRetryAt: insertParams.next_retry_at,
      createdAt: basicHelper.dateToSecondsTimestamp(time)
    };

    return {
      cacheParams: cacheParams,
      pendingWebhooksId: insertResponse.insertId
    };
  }
}

module.exports = PendingWebhook;
