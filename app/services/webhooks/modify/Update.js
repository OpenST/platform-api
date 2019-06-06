/**
 * Module to update an existing webhook.
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

    oThis.endpointUuid = params.webhook_id;
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
      .where({ client_id: oThis.clientId, uuid: oThis.endpointUuid })
      .fire();

    oThis.endpoint = endpoints[0];

    if (!oThis.endpoint) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 's_w_m_u_1',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_webhook_id'],
          debug_options: {}
        })
      );
    }
  }
}

InstanceComposer.registerAsShadowableClass(UpdateWebhook, coreConstants.icNameSpace, 'UpdateWebhook');

module.exports = {};
