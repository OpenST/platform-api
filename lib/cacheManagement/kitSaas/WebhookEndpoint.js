/**
 * Module for webhook endpoints cache.
 *
 * @module lib/cacheManagement/kitSaas/WebhookEndpoint
 */

const rootPrefix = '../../..',
  KmsWrapper = require(rootPrefix + '/lib/authentication/KmsWrapper'),
  ApiCredentialModel = require(rootPrefix + '/app/models/mysql/ApiCredential'),
  BaseCacheManagement = require(rootPrefix + '/lib/cacheManagement/kitSaas/Base'),
  WebhookEndpointModel = require(rootPrefix + '/app/models/mysql/WebhookEndpoint'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  localCipher = require(rootPrefix + '/lib/encryptors/localCipher'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

// Declare variables.
const errorConfig = basicHelper.fetchErrorConfig(apiVersions.v2);

/**
 * Class for webhook endpoints cache.
 *
 * @class WebhookEndpointCache
 */
class WebhookEndpointCache extends BaseCacheManagement {
  /**
   * Constructor for webhook endpoints cache.
   *
   * @param {object} params: cache key generation & expiry related params
   * @param {string} params.uuid: uuid v4
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.uuid = params.uuid;

    // Call sub class method to set cache level
    oThis._setCacheLevel();

    // Call sub class method to set cache key using params provided
    oThis._setCacheKeySuffix();

    // Call sub class method to set cache expiry using params provided
    oThis._setCacheExpiry();

    // Call sub class method to set cache implementer using params provided
    oThis._setCacheImplementer();
  }

  /**
   * Fetch data from cache and decrypt.
   *
   * @return {Promise<Result>}
   */
  async fetchDecryptedData() {
    const oThis = this;

    const fetchFromCacheRsp = await oThis.fetch();

    if (fetchFromCacheRsp.isFailure()) {
      return Promise.reject(fetchFromCacheRsp);
    }

    const cachedResponse = fetchFromCacheRsp.data;

    if (!cachedResponse.uuid) {
      return responseHelper.successWithData(cachedResponse);
    }

    cachedResponse.secret = await localCipher.decrypt(coreConstants.CACHE_SHA_KEY, cachedResponse.secret);

    return responseHelper.successWithData(cachedResponse);
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
   * Set cache key suffix.
   *
   * @sets oThis.cacheKeySuffix
   *
   * @private
   */
  _setCacheKeySuffix() {
    const oThis = this;
    // It uses shared cache key between company api and saas. Any changes in key here should be synced.
    oThis.cacheKeySuffix = `cm_ks_we_${oThis.uuid}`;
  }

  /**
   * Set cache expiry in oThis.cacheExpiry.
   *
   * @sets oThis.cacheExpiry
   *
   * @private
   */
  _setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 86400; // 24 hours
  }

  /**
   * Fetch data from source and return client secrets using local encryption.
   *
   * @returns {Promise<*|result>}
   * @private
   */
  async _fetchDataFromSource() {
    const oThis = this;

    const webhookEndpointData = await new WebhookEndpointModel().fetchByUuid(oThis.uuid);

    if (!webhookEndpointData[0]) {
      return responseHelper.paramValidationError({
        internal_error_identifier: 'l_cm_ks_we',
        api_error_identifier: 'webhook_endpoint_not_present',
        params_error_identifiers: ['invalid_webhook_endpoint_id'],
        error_config: errorConfig
      });
    }

    const dbRecord = webhookEndpointData[0],
      KMSObject = new KmsWrapper(ApiCredentialModel.encryptionPurpose),
      decryptedSecretSalt = await KMSObject.decrypt(dbRecord.secret_salt);

    if (!decryptedSecretSalt.Plaintext) {
      return responseHelper.paramValidationError({
        internal_error_identifier: 'l_cm_ks_we',
        api_error_identifier: 'webhook_endpoint_not_present',
        params_error_identifiers: ['invalid_webhook_endpoint_id'],
        error_config: errorConfig
      });
    }

    const infoSalt = decryptedSecretSalt.Plaintext,
      secret = await localCipher.decrypt(infoSalt, dbRecord.secret),
      secretEncr = await localCipher.encrypt(coreConstants.CACHE_SHA_KEY, secret);

    let graceSecretEncr = null;

    if (
      dbRecord.grace_expiry_at &&
      basicHelper.dateToSecondsTimestamp(dbRecord.grace_expiry_at) > basicHelper.timestampInSeconds()
    ) {
      const graceSecret = await localCipher.decrypt(infoSalt, dbRecord.grace_secret);
      graceSecretEncr = await localCipher.encrypt(coreConstants.CACHE_SHA_KEY, graceSecret);
    }

    return responseHelper.successWithData({
      uuid: dbRecord.uuid,
      clientId: dbRecord.client_id,
      endpoint: dbRecord.endpoint,
      secret: secretEncr,
      graceSecret: graceSecretEncr,
      graceExpiryAt: dbRecord.grace_expiry_at,
      status: dbRecord.status,
      updatedAt: dbRecord.updated_at
    });
  }
}

module.exports = WebhookEndpointCache;
