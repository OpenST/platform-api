/**
 * Module for webhook endpoints model.
 *
 * @module app/models/mysql/WebhookEndpoint
 */

const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  pagination = require(rootPrefix + '/lib/globalConstant/pagination'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

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
   * @param uuid
   * @returns {Promise<any>}
   */
  async fetchByUuid(uuid) {
    const oThis = this;

    return oThis
      .select('*')
      .where({ uuid: uuid })
      .fire();
  }

  async fetchAllByClientId(params) {
    const oThis = this;
    let page = params.page || 1,
      limit = params.limit || pagination.defaultWebhookListPageSize,
      offset = (page - 1) * limit;

    console.log('params------1------1-----', params);

    const webhookEndpointsData = await oThis
      .select('*')
      .where({ client_id: params.clientId })
      .limit(limit)
      .offset(offset)
      .order_by('id DESC')
      .fire();

    const webhookEndpointsDataMap = {};
    for (let i = 0; i < webhookEndpointsData.length; i++) {
      let webhookEndpoint = webhookEndpointsData[i];
      webhookEndpointsDataMap[webhookEndpoint.uuid] = {
        uuid: webhookEndpoint.uuid,
        clientId: webhookEndpoint.client_id,
        endpoint: webhookEndpoint.endpoint,
        status: webhookEndpoint.status
      };
    }

    return webhookEndpointsDataMap;
  }
}

module.exports = WebhookEndpoint;
