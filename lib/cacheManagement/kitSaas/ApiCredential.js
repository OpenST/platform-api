/**
 * Module for API credential cache.
 *
 * @module lib/cacheManagement/kitSaas/ApiCredential
 */

const rootPrefix = '../../..',
  KmsWrapper = require(rootPrefix + '/lib/authentication/KmsWrapper'),
  ApiCredentialModel = require(rootPrefix + '/app/models/mysql/ApiCredential'),
  BaseCacheManagement = require(rootPrefix + '/lib/cacheManagement/kitSaas/Base'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  localCipher = require(rootPrefix + '/lib/encryptors/localCipher'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

// Declare variables.
const errorConfig = basicHelper.fetchErrorConfig(apiVersions.v2);

/**
 * Class for API credential cache.
 *
 * @class ApiCredentialCache
 */
class ApiCredentialCache extends BaseCacheManagement {
  /**
   * Constructor for API credential cache.
   *
   * @param {object} params: cache key generation & expiry related params
   * @param {string} params.apiKey: api key
   *
   * @augments BaseCacheManagement
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.apiKey = params.apiKey;

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

    if (!cachedResponse.apiKey) {
      return responseHelper.successWithData(cachedResponse);
    }

    cachedResponse.apiSecret = await localCipher.decrypt(coreConstants.CACHE_SHA_KEY, cachedResponse.apiSecret);

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
   * Set cache key.
   *
   * @sets oThis.cacheKeySuffix
   *
   * @private
   */
  _setCacheKeySuffix() {
    const oThis = this;
    // It uses shared cache key between company api and saas. Any changes in key here should be synced.
    oThis.cacheKeySuffix = `cs_${oThis.apiKey.toLowerCase()}`;
  }

  /**
   * Set cache expiry in oThis.cacheExpiry.
   *
   * @sets oThis.cacheExpiry
   * @private
   */
  _setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 86400; // 24 hours
  }

  /**
   * Fetch data from source and return client secrets using local encryption.
   *
   * @returns {Promise<Promise<*|*|Promise<any>>|*|result>}
   * @private
   */
  async _fetchDataFromSource() {
    const oThis = this;

    const clientApiCredentialData = await new ApiCredentialModel().fetchByApiKey(oThis.apiKey);

    if (!clientApiCredentialData[0]) {
      return responseHelper.paramValidationError({
        internal_error_identifier: 'scm_ac_1',
        api_error_identifier: 'client_api_credentials_expired',
        params_error_identifiers: ['invalid_api_key'],
        error_config: errorConfig
      });
    }

    const dbRecord = clientApiCredentialData[0];

    const KMSObject = new KmsWrapper(ApiCredentialModel.encryptionPurpose);

    const decryptedSalt = await KMSObject.decrypt(dbRecord.api_salt);

    if (!decryptedSalt.Plaintext) {
      return responseHelper.paramValidationError({
        internal_error_identifier: 'cm_cs_2',
        api_error_identifier: 'client_api_credentials_expired',
        params_error_identifiers: ['invalid_api_key'],
        error_config: errorConfig
      });
    }

    const infoSalt = decryptedSalt.Plaintext;

    const apiSecret = await localCipher.decrypt(infoSalt, dbRecord.api_secret);

    const apiSecretEncr = await localCipher.encrypt(coreConstants.CACHE_SHA_KEY, apiSecret);

    return Promise.resolve(
      responseHelper.successWithData({
        clientId: dbRecord.client_id,
        apiKey: oThis.apiKey,
        apiSecret: apiSecretEncr,
        expiryTimestamp: dbRecord.expiry_timestamp
      })
    );
  }
}

module.exports = ApiCredentialCache;
