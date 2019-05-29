/**
 * Module to create new webhook.
 *
 * @module app/services/webhooks/modify/Create
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  CreateUpdateWebhookBase = require(rootPrefix + '/app/services/webhooks/modify/Base'),
  WebhookEndpointModel = require(rootPrefix + '/app/models/mysql/WebhookEndpoint'),
  WebhookEndpointConstants = require(rootPrefix + '/lib/globalConstant/webhookEndpoint'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class to create new webhook.
 *
 * @class CreateWebhook
 */
class CreateWebhook extends CreateUpdateWebhookBase {
  /**
   * Constructor to create new webhook.
   *
   * @param {object} params
   * @param {number} params.client_id: client id
   * @param {string} params.url: url
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
    oThis.endpointUrl = params.url;
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
      .where({ client_id: oThis.clientId, endpoint: oThis.endpointUrl })
      .fire();

    oThis.endpoint = endpoints[0];

    if (
      oThis.endpoint &&
      WebhookEndpointConstants.statuses[oThis.endpoint.status] === WebhookEndpointConstants.active
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_w_m_c_1',
          api_error_identifier: 'endpoint_already_present'
        })
      );
    }
  }
}

InstanceComposer.registerAsShadowableClass(CreateWebhook, coreConstants.icNameSpace, 'CreateWebhook');

module.exports = {};
