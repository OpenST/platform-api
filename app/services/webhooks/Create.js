'use strict';
/**
 * This service helps in adding new webhook in our System
 *
 * @module app/services/webhooks/Create
 */

const uuidV4 = require('uuid/v4'),
  OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  WebhookEndpointModel = require(rootPrefix + '/app/models/mysql/WebhookEndpoint'),
  WebhookEndpointConstants = require(rootPrefix + '/lib/globalConstant/webhookEndpoint');

class Create extends ServiceBase {
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.clientId = params.clientId;
    oThis.endpointUrl = params.url;
    oThis.eventTopics = params.topics;

    oThis.endpoint = null;
  }

  /**
   * perform - perform user creation
   *
   * @return {Promise<void>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis.validateParams();
    await oThis.getEndpoint();
    await oThis.createEndpoint();
    await oThis.getEndpointAllTopics();
    await oThis.createEndpointTopics();
    await oThis.enableEndpointTopics();
    await oThis.disableEndpointTopics();

    return responseHelper.successWithData({});
  }

  async validateParams() {
    //check topics is not an empty array
    const oThis = this;
    if (oThis.eventTopics.length <= 0) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_w_c_1',
          api_error_identifier: 'invalid_url'
        })
      );
    }
  }

  async getEndpoint() {
    // Query and check if endpoint is already present
    const oThis = this;
    let endpoints = await new WebhookEndpointModel()
      .select('*')
      .where({ client_id: oThis.clientId, endpoint: oThis.endpointUrl })
      .fire();
    oThis.endpoint = endpoints[0];
  }

  async createEndpoint() {
    const oThis = this;

    if (oThis.endpoint) {
      if (WebhookEndpointConstants.statuses[oThis.endpoint.status] == WebhookEndpointConstants.active) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 's_w_c_2',
            api_error_identifier: 'endpoint_already_present'
          })
        );
      } else {
        await new WebhookEndpointModel()
          .update({
            status: WebhookEndpointConstants.invertedStatuses[WebhookEndpointConstants.active]
          })
          .where({ client_id: oThis.clientId, endpoint: oThis.endpointUrl })
          .fire();
      }
    } else {
      await new WebhookEndpointModel()
        .insert({
          secret: '',
          status: WebhookEndpointConstants.invertedStatuses[WebhookEndpointConstants.active]
        })
        .fire();
    }
  }

  async getEndpointAllTopics() {}

  async createEndpointTopics() {}

  async enableEndpointTopics() {}

  async disableEndpointTopics() {}
}

InstanceComposer.registerAsShadowableClass(Create, coreConstants.icNameSpace, 'CreateUser');

module.exports = {};
