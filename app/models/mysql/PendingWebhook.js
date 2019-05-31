/**
 * Module for pending webhooks model.
 *
 * @module app/models/mysql/PendingWebhook
 */

const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
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
   * @param {Object} params
   * @param {Number} params.clientId: client id
   * @param {String} params.eventUuid: event uuid (uuid v4)
   * @param {Number} params.topic: topic
   * @param {Number} params.status: status
   * @param {String} [params.extraData]: extra data
   *
   * @returns {Promise<*>}
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
      throw 'Mandatory parameters are missing. Expected an object with the following keys: {clientId, chainId, groupId, status}';
    }

    return oThis
      .insert({
        client_id: params.clientId,
        event_uuid: params.eventUuid,
        topic: params.topic,
        extra_data: params.extraData || null,
        status: params.status,
        retry_count: 0,
        last_attempted_at: Date.now() / 1000
      })
      .fire();
  }
}

module.exports = PendingWebhook;
