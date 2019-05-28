'use strict';
/**
 * This is model for webhook subscription.
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
   * @param endpointIds
   * @returns {Promise<*|result>}
   */
  async fetchWebhookSubscriptionsByEndpointIds(endpointIds) {
    const oThis = this,
      dbRows = await oThis
        .select('*')
        .where([' webhook_endpoint_id IN (?)', endpointIds])
        .fire();

    let response = {};

    for (let i = 0; i < endpointIds.length; i++) {
      response[endpointIds[i]] = { active: [], inActive: [] };
    }

    for (let index = 0; index < dbRows.length; index++) {
      let dbRow = dbRows[index];

      if (dbRow.status == webhookSubscriptionConstants.invertedStatuses[webhookSubscriptionConstants.activeStatus]) {
        response[dbRow.webhook_endpoint_id]['active'].push(WebhookSubscription._formatDbData(dbRow));
      } else if (
        dbRow.status == webhookSubscriptionConstants.invertedStatuses[webhookSubscriptionConstants.inActiveStatus]
      ) {
        response[dbRow.webhook_endpoint_id]['inActive'].push(WebhookSubscription._formatDbData(dbRow));
      }
    }

    return responseHelper.successWithData(response);
  }
}

module.exports = WebhookSubscription;
