/**
 * Module for webhook endpoints model.
 *
 * @module app/models/mysql/WebhookEndpoint
 */

const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  pagination = require(rootPrefix + '/lib/globalConstant/pagination');

// Declare variables.
const dbName = 'kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

/**
 * Class for webhook endpoints model.
 *
 * @class WebhookEndpoint
 */
class WebhookEndpoint extends ModelBase {
  /**
   * Constructor for webhook endpoints model.
   *
   * @augments ModelBase
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'webhook_endpoints';
  }

  /**
   * Fetch webhook endpoints by id.
   *
   * @param {string/array} uuid(s)
   *
   * @returns {Promise<any>}
   */
  async fetchByUuid(uuid) {
    const oThis = this;

    return oThis
      .select('*')
      .where({ uuid: uuid })
      .fire();
  }

  /**
   * Fetch all webhook endpoints by client id.
   *
   * @param {object} params
   * @param {number} params.clientId
   * @param {number} [params.page]
   * @param {number} [params.limit]
   *
   * @returns {Promise<void>}
   */
  async fetchAllByClientId(params) {
    const oThis = this;

    const page = params.page || 1,
      limit = params.limit || pagination.defaultWebhookListPageSize,
      offset = (page - 1) * limit;

    const webhookEndpointsData = await oThis
      .select('*')
      .where({ client_id: params.clientId })
      .limit(limit)
      .offset(offset)
      .order_by('id DESC')
      .fire();

    const webhookEndpointsDataMap = {};

    for (let index = 0; index < webhookEndpointsData.length; index++) {
      const webhookEndpoint = webhookEndpointsData[index];
      webhookEndpointsDataMap[webhookEndpoint.uuid] = {
        id: webhookEndpoint.uuid,
        clientId: webhookEndpoint.client_id,
        url: webhookEndpoint.endpoint,
        status: webhookEndpoint.status,
        updatedTimestamp: basicHelper.dateToSecondsTimestamp(webhookEndpoint.updated_at)
      };
    }

    return webhookEndpointsDataMap;
  }
}

module.exports = WebhookEndpoint;
