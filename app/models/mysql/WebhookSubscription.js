/**
 * Module for webhook subscription model.
 *
 * @module app/models/mysql/WebhookSubscription
 */

const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  webhookSubscriptionConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions');

// Declare variables.
const dbName = 'kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

/**
 * Class for webhook subscription model.
 *
 * @class WebhookSubscription
 */
class WebhookSubscription extends ModelBase {
  /**
   * Constructor for webhook subscription model.
   *
   * @augments ModelBase
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'webhook_subscriptions';
  }

  /**
   * Format Db data.
   *
   * @param {object} dbRow
   * @param {number} dbRow.id
   * @param {string} dbRow.client_id
   * @param {string} dbRow.topic
   * @param {number} dbRow.webhook_endpoint_id
   * @param {string} dbRow.status
   * @param {string} dbRow.created_at
   * @param {string} dbRow.updated_at
   *
   * @return {object}
   * @private
   */
  static _formatDbData(dbRow) {
    return {
      id: dbRow.id,
      clientId: dbRow.client_id,
      topic: dbRow.topic,
      webhookEndpointId: dbRow.webhook_endpoint_id,
      status: dbRow.status,
      createdAt: dbRow.created_at,
      updatedTimestamp: basicHelper.dateToSecondsTimestamp(dbRow.updated_at)
    };
  }

  /**
   * Fetch webhook subscriptions by endpoint ids.
   *
   * @param {array} endpointUuids
   *
   * @returns {Promise<*|result>}
   */
  async fetchWebhookSubscriptionsByEndpointUuids(endpointUuids) {
    const oThis = this,
      dbRows = await oThis
        .select('*')
        .where(['webhook_endpoint_uuid IN (?)', endpointUuids])
        .fire();

    const response = {};

    for (let index = 0; index < endpointUuids.length; index++) {
      response[endpointUuids[index]] = { active: [], inActive: [] };
    }

    for (let index = 0; index < dbRows.length; index++) {
      const dbRow = dbRows[index];

      if (dbRow.status == webhookSubscriptionConstants.invertedStatuses[webhookSubscriptionConstants.activeStatus]) {
        response[dbRow.webhook_endpoint_uuid].active.push(WebhookSubscription._formatDbData(dbRow));
      } else if (
        dbRow.status == webhookSubscriptionConstants.invertedStatuses[webhookSubscriptionConstants.inActiveStatus]
      ) {
        response[dbRow.webhook_endpoint_uuid].inActive.push(WebhookSubscription._formatDbData(dbRow));
      }
    }

    return responseHelper.successWithData(response);
  }

  /**
   * Fetch webhook subscriptions by client id.
   *
   * @param {number} clientId
   *
   * @returns {Promise<*|result>}
   */
  async fetchWebhookSubscriptionsByClientId(clientId) {
    const oThis = this;

    const dbRows = await oThis
      .select('*')
      .where({
        client_id: clientId,
        status: webhookSubscriptionConstants.invertedStatuses[webhookSubscriptionConstants.activeStatus]
      })
      .fire();

    const responseData = {};

    for (let index = 0; index < dbRows.length; index++) {
      const dbRow = dbRows[index];
      responseData[dbRow.topic] = responseData[dbRow.topic] || [];
      responseData[dbRow.topic].push(dbRow.webhook_endpoint_uuid);
    }

    return responseHelper.successWithData(responseData);
  }

  /**
   * Flush cache.
   *
   * @returns {Promise<*>}
   */
  static async flushCache(webhookEndpointUuids) {
    const Cache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/WebhookSubscriptionsByUuid');

    await new Cache({ webhookEndpointUuids: webhookEndpointUuids }).clear();
  }
}

module.exports = WebhookSubscription;
