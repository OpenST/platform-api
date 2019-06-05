/**
 * Module to create new webhook.
 *
 * @module app/services/webhooks/modify/Base
 */

const crypto = require('crypto'),
  uuidV4 = require('uuid/v4');

const rootPrefix = '../../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  KmsWrapper = require(rootPrefix + '/lib/authentication/KmsWrapper'),
  WebhookEndpointModel = require(rootPrefix + '/app/models/mysql/WebhookEndpoint'),
  WebhookSubscriptionModel = require(rootPrefix + '/app/models/mysql/WebhookSubscription'),
  WebhookEndpointCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/WebhookEndpoint'),
  WebhookEndpointCacheByClientId = require(rootPrefix + '/lib/cacheManagement/kitSaas/WebhookEndpointByClientId'),
  WebhookSubscriptionsByUuidCache = require(rootPrefix +
    '/lib/cacheManagement/kitSaasMulti/WebhookSubscriptionsByUuid'),
  WebhookSubscriptionsByClientIdCache = require(rootPrefix +
    '/lib/cacheManagement/kitSaas/WebhookSubscriptionsByClientId'),
  util = require(rootPrefix + '/lib/util'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  localCipher = require(rootPrefix + '/lib/encryptors/localCipher'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  webhookEndpointConstants = require(rootPrefix + '/lib/globalConstant/webhookEndpoint'),
  webhookSubscriptionConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions');

/**
 * Class to create new webhook.
 *
 * @class CreateUpdateWebhookBase
 */
class CreateUpdateWebhookBase extends ServiceBase {
  /**
   * Constructor to create update webhook.
   *
   * @param {object} params
   * @param {number} params.client_id: client id
   * @param {array} params.topics: Array topics to subscribe
   * @param {string} [params.status]: status
   *
   * @augments ServiceBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.eventTopics = params.topics;
    oThis.status = params.status || webhookEndpointConstants.active;

    oThis.endpoint = null;
    oThis.endpointId = null;
    oThis.secretSalt = null;
    oThis.secret = null;
    oThis.uuid = null;
  }

  /**
   * Async perform: Perform webhook creation.
   *
   * @return {Promise<void>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._validateAndSanitizeParams();

    await oThis.getEndpoint();

    await oThis.createEndpoint();

    await oThis._segregateEndpointTopics();

    await oThis._createEndpointTopics();

    await oThis._activateEndpointTopics();

    await oThis._deactivateEndpointTopics();

    await oThis._clearCache();

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
   * @sets oThis.eventTopics, oThis.status
   *
   * @returns {Promise<*>}
   */
  async _validateAndSanitizeParams() {
    // Check topics is not an empty array.
    const oThis = this;

    if (oThis.eventTopics.length > webhookSubscriptionConstants.maxTopicsPerEndpoint) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_w_m_b_4',
          api_error_identifier: 'max_topics_in_endpoint'
        })
      );
    }

    for (let index = 0; index < oThis.eventTopics.length; index++) {
      oThis.eventTopics[index] = oThis.eventTopics[index].toLowerCase().trim();

      if (!webhookSubscriptionConstants.invertedTopics[oThis.eventTopics[index]]) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 's_w_m_b_2',
            api_error_identifier: 'invalid_topics'
          })
        );
      }
    }

    oThis.status = oThis.status.toLowerCase();

    if (!webhookEndpointConstants.invertedStatuses[oThis.status]) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_w_m_b_3',
          api_error_identifier: 'invalid_status'
        })
      );
    }
  }

  /**
   * Get endpoint.
   *
   * @sets oThis.endpoint
   *
   * @returns {Promise<void>}
   */
  async getEndpoint() {
    throw new Error('Sub-class to implement.');
  }

  /**
   * Create endpoint in webhook endpoints table.
   *
   * @sets oThis.endpointId, oThis.uuid, oThis.secret
   *
   * @returns {Promise<never>}
   */
  async createEndpoint() {
    const oThis = this;

    if (oThis.endpoint) {
      oThis.endpoint = oThis.endpoint.toLowerCase();

      await new WebhookEndpointModel()
        .update({
          status: webhookEndpointConstants.invertedStatuses[oThis.status]
        })
        .where({ client_id: oThis.clientId, endpoint: oThis.endpointUrl })
        .fire();

      oThis.endpointId = oThis.endpoint.id;
      oThis.uuid = oThis.endpoint.uuid;
    } else {
      const webhookEndpointsModel = await new WebhookEndpointModel()
        .select('*')
        .where({ client_id: oThis.clientId })
        .fire();

      if (webhookEndpointsModel.length >= webhookEndpointConstants.maxEndpointsPerClient) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 's_w_m_b_4',
            api_error_identifier: 'max_endpoints_reached'
          })
        );
      }

      let secret_salt;

      if (webhookEndpointsModel[0]) {
        secret_salt = webhookEndpointsModel[0].secret_salt;
        oThis.secret = webhookEndpointsModel[0].secret;
      } else {
        await oThis._generateSalt();
        secret_salt = oThis.secretSalt.CiphertextBlob;

        oThis.secret = oThis._getEncryptedApiSecret();
      }

      oThis.uuid = uuidV4();

      const createResp = await new WebhookEndpointModel()
        .insert({
          uuid: oThis.uuid,
          client_id: oThis.clientId,
          endpoint: oThis.endpointUrl,
          secret: oThis.secret,
          secret_salt: secret_salt,
          status: webhookEndpointConstants.invertedStatuses[oThis.status]
        })
        .fire();

      oThis.endpointId = createResp.insertId;
    }
  }

  /**
   * Generate secret salt.
   *
   * @sets oThis.secretSalt
   *
   * @returns {Promise}
   * @private
   */
  async _generateSalt() {
    const oThis = this;

    const kmsObj = new KmsWrapper(webhookEndpointConstants.encryptionPurpose);

    oThis.secretSalt = await kmsObj.generateDataKey();
  }

  /**
   * Decrypt salt.
   *
   * @param {string} encryptedSalt
   *
   * @sets oThis.secretSalt
   *
   * @returns {Promise}
   * @private
   */
  async _decryptSalt(encryptedSalt) {
    const oThis = this;

    const kmsObj = new KmsWrapper(webhookEndpointConstants.encryptionPurpose);

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

    const uniqueStr = crypto.randomBytes(64).toString('hex');
    const apiSecret = util.createSha256Digest(uniqueStr);

    return localCipher.encrypt(oThis.secretSalt.Plaintext, apiSecret);
  }

  /**
   * Segregate endpoint topics into create, update, or delete.
   *
   * @returns {Promise}
   * @private
   */
  async _segregateEndpointTopics() {
    const oThis = this;

    const wEndpointTopics = await new WebhookSubscriptionsByUuidCache({
      webhookEndpointUuids: [oThis.uuid]
    }).fetch();

    const endpointTopics = wEndpointTopics.data[oThis.uuid];

    oThis.activateTopicIds = [];
    oThis.deActivateTopicIds = [];
    oThis.endpointTopicsMap = {};

    for (let index = 0; index < oThis.eventTopics.length; index++) {
      oThis.endpointTopicsMap[oThis.eventTopics[index]] = 1;
    }

    for (let index = 0; index < endpointTopics.active.length; index++) {
      const activeTopic = endpointTopics.active[index];
      const topicName = webhookSubscriptionConstants.topics[activeTopic.webhook_topic_kind];
      if (!oThis.endpointTopicsMap[topicName]) {
        oThis.deActivateTopicIds.push(activeTopic.id);
      }

      delete oThis.endpointTopicsMap[topicName];
    }
    for (let index = 0; index < endpointTopics.inActive.length; index++) {
      const inactiveTopic = endpointTopics.inActive[index];
      const topicName = webhookSubscriptionConstants.topics[inactiveTopic.webhook_topic_kind];
      if (oThis.endpointTopicsMap[topicName]) {
        oThis.activateTopicIds.push(inactiveTopic.id);
      }

      delete oThis.endpointTopicsMap[topicName];
    }
  }

  /**
   * Create endpoint topics.
   *
   * @returns {Promise}
   * @private
   */
  async _createEndpointTopics() {
    const oThis = this;

    const promisesArray = [];

    for (const topic in oThis.endpointTopicsMap) {
      promisesArray.push(
        new WebhookSubscriptionModel()
          .insert({
            client_id: oThis.clientId,
            webhook_topic_kind: webhookSubscriptionConstants.invertedTopics[topic],
            webhook_endpoint_uuid: oThis.uuid,
            status: webhookSubscriptionConstants.invertedStatuses[webhookSubscriptionConstants.activeStatus]
          })
          .fire()
      );
    }

    await Promise.all(promisesArray);
  }

  /**
   * Mark webhook endpoint topics active.
   *
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

  /**
   * Clear cache.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _clearCache() {
    const oThis = this;

    // Clear webhook subscriptions cache.
    await new WebhookSubscriptionsByUuidCache({ webhookEndpointUuids: [oThis.uuid] }).clear();
    await new WebhookSubscriptionsByClientIdCache({ clientId: oThis.clientId }).clear();

    // Clear webhook endpoints cache.
    await new WebhookEndpointCache({ uuid: oThis.uuid }).clear();
    await new WebhookEndpointCacheByClientId({ clientId: oThis.clientId }).clear();
  }
}

module.exports = CreateUpdateWebhookBase;
