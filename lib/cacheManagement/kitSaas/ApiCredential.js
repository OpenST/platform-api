'use strict';

const rootPrefix = '../../..',
  BaseCacheManagement = require(rootPrefix + '/lib/cacheManagement/kitSaas/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ApiCredential = require(rootPrefix + '/app/models/mysql/ApiCredential'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  localCipher = require(rootPrefix + '/lib/encryptors/localCipher'),
  KmsWrapper = require(rootPrefix + '/lib/authentication/KmsWrapper'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  errorConfig = basicHelper.fetchErrorConfig(apiVersions.general);

class ApiCredentialCache extends BaseCacheManagement {
  /**
   * @constructor
   *
   * @param {Object} params - cache key generation & expiry related params
   *
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.apiKey = params['apiKey'];

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
   * fetch data from cache and decrypt
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

    if (!cachedResponse['apiKey']) {
      return responseHelper.successWithData(cachedResponse);
    }

    cachedResponse['apiSecret'] = await localCipher.decrypt(coreConstants.CACHE_SHA_KEY, cachedResponse['apiSecret']);

    return responseHelper.successWithData(cachedResponse);
  }

  /**
   *
   * Set cache level
   *
   * @private
   */
  _setCacheLevel() {
    const oThis = this;
    oThis.cacheLevel = cacheManagementConst.kitSaasSubEnvLevel;
  }

  /**
   * set cache key
   */
  _setCacheKeySuffix() {
    const oThis = this;
    // It uses shared cache key between company api and saas. any changes in key here should be synced
    oThis.cacheKeySuffix = `cs_${oThis.apiKey.toLowerCase()}`;
  }

  /**
   * set cache expiry in oThis.cacheExpiry and return it
   *
   * @return {Number}
   */
  _setCacheExpiry() {
    const oThis = this;
    oThis.cacheExpiry = 86400; // 24 hours
  }

  /**
   * fetch data from source and return client secrets using local encryption
   *
   * @return {Result}
   */
  async _fetchDataFromSource() {
    const oThis = this;

    let clientApiCredentialData = await new ApiCredential().fetchByApiKey(oThis.apiKey);

    if (!clientApiCredentialData[0]) {
      return responseHelper.error({
        internal_error_identifier: 'scm_ac_1',
        api_error_identifier: 'client_api_credentials_expired',
        error_config: errorConfig
      });
    }

    const dbRecord = clientApiCredentialData[0];

    let KMSObject = new KmsWrapper(ApiCredential.encryptionPurpose);

    let decryptedSalt = await KMSObject.decrypt(dbRecord['api_salt']);

    if (!decryptedSalt['Plaintext']) {
      return responseHelper.error({
        internal_error_identifier: 'cm_cs_2',
        api_error_identifier: 'client_api_credentials_expired',
        error_config: errorConfig
      });
    }

    let infoSalt = decryptedSalt['Plaintext'];

    let apiSecret = await localCipher.decrypt(infoSalt, dbRecord['api_secret']);

    let apiSecretEncr = await localCipher.encrypt(coreConstants.CACHE_SHA_KEY, apiSecret);

    return Promise.resolve(
      responseHelper.successWithData({
        clientId: dbRecord['client_id'],
        apiKey: oThis.apiKey,
        apiSecret: apiSecretEncr,
        expiryTimestamp: dbRecord['expiry_timestamp']
      })
    );
  }
}

module.exports = ApiCredentialCache;
