'use strict';
/**
 * This service helps in adding new webhook in our System.
 *
 * @module app/services/webhooks/Create
 */

const crypto = require('crypto'),
  uuidV4 = require('uuid/v4'),
  OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  KmsWrapper = require(rootPrefix + '/lib/authentication/KmsWrapper'),
  WebhookEndpointModel = require(rootPrefix + '/app/models/mysql/WebhookEndpoint'),
  WebhookEndpointConstants = require(rootPrefix + '/lib/globalConstant/webhookEndpoint'),
  WebhookSubscriptionModel = require(rootPrefix + '/app/models/mysql/WebhookSubscription'),
  WebhookSubscriptionsByUuidCache = require(rootPrefix +
    '/lib/cacheManagement/kitSaasMulti/WebhookSubscriptionsByUuid'),
  util = require(rootPrefix + '/lib/util'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  localCipher = require(rootPrefix + '/lib/encryptors/localCipher'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  webhookSubscriptionConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions');

/**
 * Class to create webhook.
 *
 * @class CreateWebhook
 */
class CreateWebhook extends ServiceBase {
  /**
   * Constructor foe create webhook class.
   *
   * @param params
   * @param {Number} params.client_id - client id
   * @param {String} params.url - url
   * @param {Array} params.topics - topics to subscribe
   * @param {String} [params.status] - status
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.clientId = params.clientId;
    oThis.endpointUrl = params.url;
    oThis.eventTopics = params.topics;
    oThis.status = params.status || WebhookEndpointConstants.active;

    oThis.endpoint = null;
    oThis.endpointId = null;
    oThis.secretSalt = null;
    oThis.secret = null;
    oThis.uuid = null;
  }

  /**
   * perform - perform webhook creation
   *
   * @return {Promise<void>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis.validateParams();

    await oThis.getEndpoint();

    await oThis.createEndpoint();

    await oThis._segregateEndpointTopics();

    await oThis._createEndpointTopics();

    await oThis._activateEndpointTopics();

    await oThis._deactivateEndpointTopics();

    return responseHelper.successWithData({
      [resultType.webhook]: {
        id: oThis.uuid,
        url: oThis.endpointUrl,
        status: oThis.status,
        topics: oThis.eventTopics,
        updatedTimestamp: Date.now() / 1000,
        secret: oThis.secret
      }
    });
  }

  /**
   * Validate params.
   *
   * @returns {Promise<*>}
   */
  async validateParams() {
    //check topics is not an empty array
    const oThis = this;
    oThis.eventTopics = oThis.eventTopics.split(',');
    if (oThis.eventTopics.length <= 0) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_w_c_1',
          api_error_identifier: 'invalid_url'
        })
      );
    }

    for (let i = 0; i < oThis.eventTopics.length; i++) {
      oThis.eventTopics[i] = oThis.eventTopics[i].toLowerCase();
      if (!webhookSubscriptionConstants.invertedTopics[oThis.eventTopics[i]]) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 's_w_c_2',
            api_error_identifier: 'invalid_topics'
          })
        );
      }
    }

    oThis.status = oThis.status.toLowerCase();
    if (!WebhookEndpointConstants.invertedStatuses[oThis.status]) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_w_c_3',
          api_error_identifier: 'invalid_status'
        })
      );
    }
  }

  /**
   * Get endpoint.
   *
   * @returns {Promise<void>}
   */
  async getEndpoint() {
    // Query and check if endpoint is already present
    const oThis = this;
    let endpoints = await new WebhookEndpointModel()
      .select('*')
      .where({ client_id: oThis.clientId, endpoint: oThis.endpointUrl })
      .fire();
    oThis.endpoint = endpoints[0];
  }

  /**
   * Create endpoint in webhook endpoints table.
   *
   * @returns {Promise<never>}
   */
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
      oThis.endpointId = oThis.endpoint.id;
      oThis.uuid = oThis.endpoint.uuid;
    } else {
      let wEndpoints = await new WebhookEndpointModel()
        .select('*')
        .where({ client_id: oThis.clientId })
        .limit(1)
        .fire();

      let secret_salt;
      if (wEndpoints[0]) {
        secret_salt = wEndpoints[0].secret_salt;
        oThis.secret = wEndpoints[0].secret;
      } else {
        await oThis._generateSalt();
        secret_salt = oThis.secretSalt.CiphertextBlob;
        oThis.secret = oThis._getEncryptedApiSecret();
      }
      oThis.uuid = uuidV4();

      let createResp = await new WebhookEndpointModel()
        .insert({
          uuid: oThis.uuid,
          client_id: oThis.clientId,
          endpoint: oThis.endpointUrl,
          secret: oThis.secret,
          secret_salt: secret_salt,
          status: WebhookEndpointConstants.invertedStatuses[oThis.status]
        })
        .fire();
      oThis.endpointId = createResp.insertId;
    }
  }

  /**
   * Generate secret salt.
   *
   * @returns {Promise}
   * @private
   */
  async _generateSalt() {
    const oThis = this;
    let kmsObj = new KmsWrapper(WebhookEndpointConstants.encryptionPurpose);
    oThis.secretSalt = await kmsObj.generateDataKey();
  }

  /**
   * Decrypt salt.
   * @param encryptedSalt
   * @returns {Promise}
   * @private
   */
  async _decryptSalt(encryptedSalt) {
    const oThis = this;
    let kmsObj = new KmsWrapper(WebhookEndpointConstants.encryptionPurpose);
    oThis.secretSalt = await kmsObj.decrypt(encryptedSalt);
  }

  /**
   * Get encrypted secret.
   *
   * @returns {*}
   * @private
   */
  _getEncryptedApiSecret() {
    const oThis = this;
    let uniqueStr = crypto.randomBytes(64).toString('hex');
    let apiSecret = util.createSha256Digest(uniqueStr);
    return localCipher.encrypt(oThis.secretSalt.Plaintext, apiSecret);
  }

  /**
   * Segregate endpoint topics into create, update, or delete.
   * @returns {Promise}
   * @private
   */
  async _segregateEndpointTopics() {
    const oThis = this;
    let wEndpointTopics = await new WebhookSubscriptionsByUuidCache({
      webhookEndpointUuids: [oThis.uuid]
    }).fetch();
    let endpointTopics = wEndpointTopics.data[oThis.uuid];
    oThis.activateTopicIds = [];
    oThis.deActivateTopicIds = [];
    oThis.endpointTopicsMap = {};
    for (let i = 0; i < oThis.eventTopics.length; i++) {
      oThis.endpointTopicsMap[oThis.eventTopics[i]] = 1;
    }

    for (let i = 0; i < endpointTopics['active'].length; i++) {
      let inactiveTopic = endpointTopics['active'][i];
      if (!oThis.endpointTopicsMap[inactiveTopic.topic]) {
        oThis.deActivateTopicIds.push(inactiveTopic.id);
      }
      delete oThis.endpointTopicsMap[inactiveTopic.topic];
    }
    for (let i = 0; i < endpointTopics['inActive'].length; i++) {
      let inactiveTopic = endpointTopics['inActive'][i];
      if (oThis.endpointTopicsMap[inactiveTopic.topic]) {
        oThis.activateTopicIds.push(inactiveTopic.id);
      }
      delete oThis.endpointTopicsMap[inactiveTopic.topic];
    }
  }

  /**
   *
   * @returns {Promise}
   * @private
   */
  async _createEndpointTopics() {
    const oThis = this;
    for (let topic in oThis.endpointTopicsMap) {
      await new WebhookSubscriptionModel()
        .insert({
          client_id: oThis.clientId,
          topic: webhookSubscriptionConstants.invertedTopics[topic],
          webhook_endpoint_uuid: oThis.uuid,
          status: webhookSubscriptionConstants.invertedStatuses[webhookSubscriptionConstants.activeStatus]
        })
        .fire();
    }
  }

  /**
   * Mark webhook endpoint topics active.
   * @returns {Promise<void>}
   * @private
   */
  async _activateEndpointTopics() {
    const oThis = this;

    if (oThis.activateTopicIds.length > 0) {
      await new WebhookSubscriptionModel()
        .update({
          status: webhookSubscriptionConstants.invertedStatuses[webhookSubscriptionConstants.activeStatus]
        })
        .where({ id: oThis.activateTopicIds })
        .fire();
    }
  }

  /**
   * Mark webhook endpoint topics inactive.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _deactivateEndpointTopics() {
    const oThis = this;

    if (oThis.deActivateTopicIds.length > 0) {
      await new WebhookSubscriptionModel()
        .update({
          status: webhookSubscriptionConstants.invertedStatuses[webhookSubscriptionConstants.inActiveStatus]
        })
        .where({ id: oThis.deActivateTopicIds })
        .fire();
    }
  }
}

InstanceComposer.registerAsShadowableClass(CreateWebhook, coreConstants.icNameSpace, 'CreateWebhook');

module.exports = {};
