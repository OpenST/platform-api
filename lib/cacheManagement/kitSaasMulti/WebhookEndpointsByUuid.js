/**
 * Cache for webhook subscription topics by webhook endpoint id.
 *
 * @module lib/cacheManagement/kitSaasMulti/WebhookEndpointsByUuid
 */

const rootPrefix = '../../..',
  KmsWrapper = require(rootPrefix + '/lib/authentication/KmsWrapper'),
  ApiCredentialModel = require(rootPrefix + '/app/models/mysql/ApiCredential'),
  WebhookEndpointModel = require(rootPrefix + '/app/models/mysql/WebhookEndpoint'),
  BaseKitSaasMultiCacheManagement = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/Base'),
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
   * @augments BaseKitSaasMultiCacheManagement
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
   * @param {string} [timeDelta]
   *
   * @sets oThis.cacheExpiry
   *
   * @private
   */
  _setCacheExpiry(timeDelta) {
    const oThis = this;

    oThis.cacheExpiry = timeDelta || 24 * 60 * 60; // 1 day
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
    const oThis = this;

    const response = {};

    let lowestTimeDelta = oThis.cacheExpiry;

    for (let index = 0; index < webhookEndpointUuids.length; index++) {
      response[webhookEndpointUuids[index]] = {};
    }

    const webhookEndpointsData = await new WebhookEndpointModel().fetchByUuids(webhookEndpointUuids);

    for (let index = 0; index < webhookEndpointsData.length; index++) {
      const webhookEndpoint = webhookEndpointsData[index],
        KMSObject = new KmsWrapper(ApiCredentialModel.encryptionPurpose),
        decryptedSecretSalt = await KMSObject.decrypt(webhookEndpoint.secret_salt),
        infoSalt = decryptedSecretSalt.Plaintext,
        secret = await localCipher.decrypt(infoSalt, webhookEndpoint.secret),
        encryptedSecret = await localCipher.encrypt(coreConstants.CACHE_SHA_KEY, secret);

      let encryptedGraceSecret = null;

      const currentTime = new Date();

      if (
        webhookEndpoint.grace_expiry_at &&
        basicHelper.dateToSecondsTimestamp(webhookEndpoint.grace_expiry_at) >
          basicHelper.dateToSecondsTimestamp(currentTime)
      ) {
        const graceSecret = await localCipher.decrypt(infoSalt, webhookEndpoint.grace_secret);
        encryptedGraceSecret = await localCipher.encrypt(coreConstants.CACHE_SHA_KEY, graceSecret);

        const currentTimeDelta =
          basicHelper.dateToSecondsTimestamp(webhookEndpoint.grace_expiry_at) -
          basicHelper.dateToSecondsTimestamp(currentTime);

        lowestTimeDelta = Math.min(...[currentTimeDelta, lowestTimeDelta]);
      }

      response[webhookEndpoint.uuid] = {
        uuid: webhookEndpoint.uuid,
        clientId: webhookEndpoint.client_id,
        endpoint: webhookEndpoint.endpoint,
        apiVersion: webhookEndpoint.api_version,
        secret: encryptedSecret,
        graceSecret: encryptedGraceSecret,
        graceExpiryAt: webhookEndpoint.grace_expiry_at,
        status: webhookEndpoint.status,
        updatedAt: webhookEndpoint.updated_at
      };
    }

    oThis._setCacheExpiry(lowestTimeDelta);

    return responseHelper.successWithData(response);
  }
}

module.exports = WebhookEndpointsByUuid;
