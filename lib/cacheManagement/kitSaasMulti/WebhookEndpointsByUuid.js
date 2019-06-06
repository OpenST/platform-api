/**
 * Cache for webhook subscription topics by webhook endpoint id.
 *
 * @module lib/cacheManagement/kitSaasMulti/WebhookSubscriptionsByUuid
 */

const rootPrefix = '../../..',
  BaseKitSaasMultiCacheManagement = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/Base'),
  KmsWrapper = require(rootPrefix + '/lib/authentication/KmsWrapper'),
  ApiCredentialModel = require(rootPrefix + '/app/models/mysql/ApiCredential'),
  WebhookEndpointModel = require(rootPrefix + '/app/models/mysql/WebhookEndpoint'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  localCipher = require(rootPrefix + '/lib/encryptors/localCipher'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

/**
 * Class for webhook subscriptions by endpoint id cache.
 *
 * @class WebhookTopicsByEndpointId
 */
class WebhookEndpointsByUuid extends BaseKitSaasMultiCacheManagement {
  /**
   * Constructor for webhook subscriptions by endpoint id cache.
   *
   * @param {object} params: cache key generation & expiry related params
   * @param {array<string/number>} params.webhookEndpointUuids
   *
   * @augments WebhookEndpointsByUuid
   *
   * @constructor
   */
  constructor(params) {
    super();

    const oThis = this;

    oThis.webhookEndpointUuids = params.webhookEndpointUuids;
    oThis.cacheType = cacheManagementConst.sharedMemcached;

    // Call sub class method to set cache level.
    oThis._setCacheLevel();

    // Call sub class method to set cache keys using params provided.
    oThis._setCacheKeys();

    // Call sub class method to set inverted cache keys using params provided.
    oThis._setInvertedCacheKeys();

    // Call sub class method to set cache expiry using params provided.
    oThis._setCacheExpiry();

    // Call sub class method to set cache implementer using params provided.
    oThis._setCacheImplementer();
  }

  /**
   * Set cache level.
   *
   * @sets oThis.cacheLevel
   *
   * @private
   */
  _setCacheLevel() {
    const oThis = this;

    oThis.cacheLevel = cacheManagementConst.kitSaasSubEnvLevel;
  }

  /**
   * Set cache keys.
   *
   * @sets oThis.saasCacheKeys
   *
   * @private
   */
  _setCacheKeys() {
    const oThis = this;

    // It uses shared cache key between company api and saas. Any changes in key here should be synced.
    for (let index = 0; index < oThis.webhookEndpointUuids.length; index++) {
      oThis.saasCacheKeys[oThis._saasCacheKeyPrefix() + 'cm_ksm_webu_' + oThis.webhookEndpointUuids[index]] =
        oThis.webhookEndpointUuids[index];
      // NOTE: We are not setting kitCacheKeys here as the cacheLevel is only saasSubEnvLevel.
    }
  }

  /**
   * Set cache expiry.
   *
   * @sets oThis.cacheExpiry
   *
   * @private
   */
  _setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 24 * 60 * 60; // 1 day
  }

  /**
   * Fetch data from source.
   *
   * @param {array<string/number>} webhookEndpointUuids
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchDataFromSource(webhookEndpointUuids) {
    const response = {};

    for (let i = 0; i < webhookEndpointUuids.length; i++) {
      response[webhookEndpointUuids[i]] = {};
    }

    const webhookEndpointsData = await new WebhookEndpointModel().fetchByUuid(webhookEndpointUuids);

    for (let i = 0; i < webhookEndpointsData.length; i++) {
      let webhookEndpoint = webhookEndpointsData[i],
        KMSObject = new KmsWrapper(ApiCredentialModel.encryptionPurpose),
        decryptedSecretSalt = await KMSObject.decrypt(webhookEndpoint.secret_salt),
        infoSalt = decryptedSecretSalt.Plaintext,
        secret = await localCipher.decrypt(infoSalt, webhookEndpoint.secret),
        secretEncr = await localCipher.encrypt(coreConstants.CACHE_SHA_KEY, secret),
        graceSecretEncr = null;

      if (
        webhookEndpoint.grace_expiry_at &&
        basicHelper.dateToSecondsTimestamp(webhookEndpoint.grace_expiry_at) > basicHelper.timestampInSeconds()
      ) {
        const graceSecret = await localCipher.decrypt(infoSalt, webhookEndpoint.grace_secret);
        graceSecretEncr = await localCipher.encrypt(coreConstants.CACHE_SHA_KEY, graceSecret);
      }

      response[webhookEndpoint.uuid] = {
        uuid: webhookEndpoint.uuid,
        clientId: webhookEndpoint.client_id,
        endpoint: webhookEndpoint.endpoint,
        apiVersion: webhookEndpoint.api_version,
        secret: secretEncr,
        graceSecret: graceSecretEncr,
        graceExpiryAt: webhookEndpoint.grace_expiry_at,
        status: webhookEndpoint.status,
        updatedAt: webhookEndpoint.updated_at
      };
    }
    return responseHelper.successWithData(response);
  }
}

module.exports = WebhookEndpointsByUuid;
