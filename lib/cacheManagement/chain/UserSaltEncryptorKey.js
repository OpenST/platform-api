'use strict';

/**
 * Cache to privately store token encryption salt.
 *
 * @module lib/cacheManagement/chain/UserSaltEncryptorKey
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  CacheManagementChainBase = require(rootPrefix + '/lib/cacheManagement/chain/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  EncryptionSaltModel = require(rootPrefix + '/app/models/mysql/EncryptionSalt'),
  encryptionSaltConst = require(rootPrefix + '/lib/globalConstant/encryptionSalt'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  errorConfig = basicHelper.fetchErrorConfig(apiVersions.general),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  KmsWrapper = require(rootPrefix + '/lib/authentication/KmsWrapper'),
  kmsConstants = require(rootPrefix + '/lib/globalConstant/kms'),
  localCipher = require(rootPrefix + '/lib/encryptors/localCipher');

class UserSaltEncryptorKey extends CacheManagementChainBase {
  /**
   * @constructor
   *
   * @param {Object} params - cache key generation & expiry related params
   *
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.tokenId = params['tokenId'];

    oThis.consistentBehavior = '1';

    // Call sub class method to set cache level
    oThis._setCacheLevel();

    // Call sub class method to set cache key using params provided
    oThis.setCacheKey();

    // Call sub class method to set cache expiry using params provided
    oThis.setCacheExpiry();

    // Call sub class method to set cache implementer using params provided
    oThis._setCacheImplementer();
  }

  /**
   *
   * Set cache level
   *
   * @private
   */
  _setCacheLevel() {
    const oThis = this;
    oThis.cacheLevel = cacheManagementConst.saasSubEnvLevel;
  }

  /**
   * set cache key
   */
  setCacheKey() {
    const oThis = this;

    oThis.cacheKey = (oThis._cacheKeyPrefix() + 'c_usek_' + oThis.tokenId).toLowerCase();
  }

  /**
   * set cache expiry in oThis.cacheExpiry and return it
   */
  setCacheExpiry() {
    const oThis = this;
    oThis.cacheExpiry = 86400; // 24 hours
  }

  /**
   * fetch data from source and return eth balance from VC in Wei
   *
   * @return {Result}
   */
  async fetchDataFromSource() {
    const oThis = this;

    const kind = encryptionSaltConst.invertedKinds[encryptionSaltConst.userEncryptionKind],
      encryptionSalts = await new EncryptionSaltModel().getByTokenIdAndKind(oThis.tokenId, kind),
      encryptionSalt = encryptionSalts[0];

    if (!encryptionSalt) {
      return responseHelper.error({
        internal_error_identifier: 'ccm_usek_1',
        api_error_identifier: 'token_invalid',
        error_config: errorConfig
      });
    }

    let KMSObject = new KmsWrapper(kmsConstants.userScryptSaltPurpose),
      decryptedSalt = await KMSObject.decrypt(encryptionSalt.salt);

    if (!decryptedSalt['Plaintext']) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'ccm_usek_2',
          api_error_identifier: 'invalid_params',
          error_config: errorConfig
        })
      );
    }

    return responseHelper.successWithData({
      encryption_salt_e: localCipher.encrypt(coreConstants.CACHE_SHA_KEY, decryptedSalt['Plaintext'].toString('hex'))
    });
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

    let encryption_salt_d = localCipher.decrypt(coreConstants.CACHE_SHA_KEY, cachedResponse['encryption_salt_e']);

    return responseHelper.successWithData({
      encryption_salt_d: encryption_salt_d
    });
  }
}

InstanceComposer.registerAsShadowableClass(
  UserSaltEncryptorKey,
  coreConstants.icNameSpace,
  'UserSaltEncryptorKeyCache'
);

module.exports = {};
