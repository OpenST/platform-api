/**
 * Module to create new webhook.
 *
 * @module app/services/webhooks/modify/Base
 */

const uuidV4 = require('uuid/v4');

const rootPrefix = '../../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  KmsWrapper = require(rootPrefix + '/lib/authentication/KmsWrapper'),
  WebhookEndpointModel = require(rootPrefix + '/app/models/mysql/WebhookEndpoint'),
  WebhookSubscriptionModel = require(rootPrefix + '/app/models/mysql/WebhookSubscription'),
  WebhookEndpointsByUuidCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/WebhookEndpointsByUuid'),
  WebhookEndpointCacheByClientId = require(rootPrefix + '/lib/cacheManagement/kitSaas/WebhookEndpointByClientId'),
  WebhookSubscriptionsByUuidCache = require(rootPrefix +
    '/lib/cacheManagement/kitSaasMulti/WebhookSubscriptionsByUuid'),
  WebhookSubscriptionsByClientIdCache = require(rootPrefix +
    '/lib/cacheManagement/kitSaas/WebhookSubscriptionsByClientId'),
  util = require(rootPrefix + '/lib/util'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  localCipher = require(rootPrefix + '/lib/encryptors/localCipher'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  webhookEndpointsConstants = require(rootPrefix + '/lib/globalConstant/webhookEndpoints'),
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
   * @param {array} params.topics: array of topics to subscribe
   * @param {string} [params.status]: status
   *
   * @augments ServiceBase
   *
   * @constructor
   */
  constructor(params) {
    super();

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.eventTopics = params.topics;
    oThis.status = params.status || webhookEndpointsConstants.activeStatus;

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

    const invertedTopics = oThis._formatTopics();

    return responseHelper.successWithData({
      [resultType.webhook]: {
        id: oThis.uuid,
        url: oThis.endpointUrl,
        status: webhookEndpointsConstants.invertedStatuses[oThis.status],
        topics: invertedTopics,
        updatedTimestamp: Math.floor(Date.now() / 1000)
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

    oThis.eventTopics = oThis.eventTopics.filter(function(element) {
      return element;
    });

    // Convert an array to a set and then convert it back to an array, to remove duplicate elements.
    oThis.eventTopics = [...new Set(oThis.eventTopics)];

    for (let index = 0; index < oThis.eventTopics.length; index++) {
      oThis.eventTopics[index] = oThis.eventTopics[index].toLowerCase().trim();

      if (!webhookSubscriptionConstants.invertedTopics[oThis.eventTopics[index]]) {
        return Promise.reject(
          responseHelper.paramValidationError({
            internal_error_identifier: 's_w_m_b_1',
            api_error_identifier: 'invalid_api_params',
            params_error_identifiers: ['invalid_topics'],
            debug_options: {}
          })
        );
      }
    }

    oThis.status = oThis.status.toLowerCase();

    const validStatuses = basicHelper.deepDup(webhookEndpointsConstants.invertedStatuses);

    delete validStatuses[webhookEndpointsConstants.deleteStatus];

    if (!validStatuses[oThis.status]) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 's_w_m_b_2',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['invalid_status'],
          debug_options: {}
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
      oThis.endpointUrl = oThis.endpoint.endpoint.toLowerCase();

      await new WebhookEndpointModel()
        .update({
          status: webhookEndpointsConstants.invertedStatuses[oThis.status]
        })
        .where({ client_id: oThis.clientId, endpoint: oThis.endpointUrl })
        .fire();

      oThis.endpointId = oThis.endpoint.id;
      oThis.uuid = oThis.endpoint.uuid;
    } else {
      const webhookEndpoints = await new WebhookEndpointModel()
        .select('*')
        .where({
          client_id: oThis.clientId,
          status: webhookSubscriptionConstants.invertedStatuses[webhookSubscriptionConstants.activeStatus]
        })
        .fire();

      if (webhookEndpoints.length >= webhookEndpointsConstants.maxEndpointsPerClient) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 's_w_m_b_3',
            api_error_identifier: 'max_endpoints_reached'
          })
        );
      }

      let secret_salt;

      if (webhookEndpoints[0]) {
        secret_salt = webhookEndpoints[0].secret_salt;
        oThis.secret = webhookEndpoints[0].secret;
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
          status: webhookEndpointsConstants.invertedStatuses[oThis.status]
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

    const kmsObj = new KmsWrapper(webhookEndpointsConstants.encryptionPurpose);

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

    const kmsObj = new KmsWrapper(webhookEndpointsConstants.encryptionPurpose);

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

    const apiSecret = util.generateWebhookSecret();

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
      const topicName = webhookSubscriptionConstants.topics[activeTopic.webhookTopicKind];
      if (!oThis.endpointTopicsMap[topicName]) {
        oThis.deActivateTopicIds.push(activeTopic.id);
      }

      delete oThis.endpointTopicsMap[topicName];
    }
    for (let index = 0; index < endpointTopics.inActive.length; index++) {
      const inactiveTopic = endpointTopics.inActive[index];
      const topicName = webhookSubscriptionConstants.topics[inactiveTopic.webhookTopicKind];
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
    await new WebhookEndpointsByUuidCache({ webhookEndpointUuids: [oThis.uuid] }).clear();
    await new WebhookEndpointCacheByClientId({ clientId: oThis.clientId }).clear();
  }

  /**
   * Convert topics to inverted topics.
   *
   * @returns {array}
   * @private
   */
  _formatTopics() {
    const oThis = this;

    const tempArray = [];

    for (let index = 0; index < oThis.eventTopics.length; index++) {
      tempArray.push(webhookSubscriptionConstants.invertedTopics[oThis.eventTopics[index]]);
    }

    return tempArray;
  }
}

module.exports = CreateUpdateWebhookBase;
