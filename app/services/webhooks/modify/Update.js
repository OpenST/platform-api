/**
 * Module to create new webhook.
 *
 * @module app/services/webhooks/modify/Update
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  WebhookEndpointModel = require(rootPrefix + '/app/models/mysql/WebhookEndpoint'),
  CreateUpdateWebhookBase = require(rootPrefix + '/app/services/webhooks/modify/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class to update a webhook.
 *
 * @class UpdateWebhook
 */
class UpdateWebhook extends CreateUpdateWebhookBase {
  /**
   * Constructor to update a webhook.
   *
   * @param {object} params
   * @param {number} params.client_id: client id
   * @param {string} params.endpoint_id: endpoint id in case of existing endpoint
   * @param {array} params.topics: array of topics to subscribe
   * @param {string} params.webhook_id: webhook id
   * @param {string} [params.status]: status
   *
   * @augments CreateUpdateWebhookBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.endpointUuId = params.webhook_id;
  }

  /**
   * Get endpoint.
   *
   * @sets oThis.endpoint
   *
   * @returns {Promise<void>}
   */
  async getEndpoint() {
    // Query and check if endpoint is already present.
    const oThis = this;

    const endpoints = await new WebhookEndpointModel()
      .select('*')
      .where({ client_id: oThis.clientId, uuid: oThis.endpointUuId })
      .fire();

    oThis.endpoint = endpoints[0];

    if (!oThis.endpoint) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_w_m_u_1',
          api_error_identifier: 'invalid_endpoint_id'
        })
      );
    }
  }
}

InstanceComposer.registerAsShadowableClass(UpdateWebhook, coreConstants.icNameSpace, 'UpdateWebhook');

module.exports = {};
