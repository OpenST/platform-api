/**
 * Module for pending webhooks model.
 *
 * @module app/models/mysql/PendingWebhook
 */

const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  PendingWebhooksCache = require(rootPrefix + '/lib/cacheManagement/shared/PendingWebhooks'),
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
   * @param {number} params.topic: topic
   * @param {number} params.status: status
   * @param {string} [params.extraData]: extra data
   *
   * @returns {Promise<number>}
   */
  async insertRecord(params) {
    const oThis = this;

    // Perform validations.
    if (
      !params.hasOwnProperty('clientId') ||
      !params.hasOwnProperty('eventUuid') ||
      !params.hasOwnProperty('topic') ||
      !params.hasOwnProperty('status')
    ) {
      throw new Error(
        'Mandatory parameters are missing. Expected an object with the following keys: {clientId, chainId, groupId, status}'
      );
    }

    const insertParams = {
      client_id: params.clientId,
      event_uuid: params.eventUuid,
      topic: params.topic,
      extra_data: params.extraData || null,
      status: params.status,
      retry_count: 0,
      last_attempted_at: Date.now() / 1000
    };

    const insertResponse = await oThis.insert(insertParams).fire();

    const pendingWebhooksCache = new PendingWebhooksCache({
      pendingWebhookId: insertResponse.insertId
    });

    // Set pending webhooks cache.
    const cacheParams = {
      clientId: insertParams.client_id,
      eventUuid: insertParams.event_uuid,
      topic: insertParams.topic,
      extraData: insertParams.extra_data,
      status: insertParams.status,
      retryCount: insertParams.retry_count,
      lastAttemptedAt: insertParams.last_attempted_at
    };

    await pendingWebhooksCache._setCache(cacheParams);

    return insertResponse.insertId;
  }
}

module.exports = PendingWebhook;
