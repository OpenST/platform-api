/**
 * Module to create new webhook.
 *
 * @module app/services/webhooks/modify/Update
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  CreateUpdateWebhookBase = require(rootPrefix + '/app/services/webhooks/modify/Base'),
  WebhookEndpointModel = require(rootPrefix + '/app/models/mysql/WebhookEndpoint'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class to create new webhook.
 *
 * @class UpdateWebhook
 */
class UpdateWebhook extends CreateUpdateWebhookBase {
  /**
   * Constructor to create new webhook.
   *
   * @param {object} params
   * @param {number} params.client_id: client id
   * @param {string} params.endpoint_id: endpoint id in case of existing endpoint
   * @param {string} params.topics: comma separated string of topics to subscribe
   * @param {string} [params.status]: status
   *
   * @augments ServiceBase
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
