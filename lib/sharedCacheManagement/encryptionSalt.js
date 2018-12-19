'use strict';

const rootPrefix = '../..',
  BaseCache = require(rootPrefix + '/lib/sharedCacheManagement/base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  EncryptionSaltModel = require(rootPrefix + '/app/models/mysql/EncryptionSalt'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  localCipher = require(rootPrefix + '/lib/encryptors/localCipher'),
  KmsWrapper = require(rootPrefix + '/lib/authentication/kmsWrapper'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  errorConfig = basicHelper.fetchErrorConfig(apiVersions.general),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

class EncryptionSaltCache extends BaseCache {
  /**
   * @constructor
   *
   * @augments BaseCache
   *
   * @param {Object} params - cache key generation & expiry related params
   *
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.managedAddressSaltId = params['id'];

    oThis.cacheType = cacheManagementConst.shared_memcached;
    oThis.consistentBehavior = '1';

    // Call sub class method to set cache key using params provided
    oThis.setCacheKey();

    // Call sub class method to set cache expiry using params provided
    oThis.setCacheExpiry();

    // Call sub class method to set cache implementer using params provided
    oThis.setCacheImplementer();
  }

  /**
   * set cache key
   *
   * @return {String}
   */
  setCacheKey() {
    const oThis = this;

    oThis.cacheKey = oThis._sharedCacheKeyPrefix() + 'cma_' + oThis.managedAddressSaltId;

    return oThis.cacheKey;
  }

  /**
   * set cache expiry in oThis.cacheExpiry and return it
   *
   * @return {Number}
   */
  setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 86400; // 24 hours ;

    return oThis.cacheExpiry;
  }

  /**
   * fetch data from source and return client secrets using local encryption
   *
   * @return {Result}
   */
  async fetchDataFromSource() {
    const oThis = this;

    let addrSalt = await new EncryptionSaltModel().getById(oThis.managedAddressSaltId);

    if (!addrSalt[0]) {
      return responseHelper.error({
        internal_error_identifier: 'cm_mas_1',
        api_error_identifier: 'invalid_params',
        error_config: errorConfig
      });
    }

    let KMSObject = new KmsWrapper('knownAddresses');
    let decryptedSalt = await KMSObject.decrypt(addrSalt[0]['salt']);
    if (!decryptedSalt['Plaintext']) {
      return responseHelper.error({
        internal_error_identifier: 'cm_mas_2',
        api_error_identifier: 'invalid_params',
        error_config: errorConfig
      });
    }

    let salt = decryptedSalt['Plaintext'];
    let addrSaltEncr = await localCipher.encrypt(coreConstants.CACHE_SHA_KEY, salt.toString('hex'));

    let data = { addressSalt: addrSaltEncr };

    return Promise.resolve(responseHelper.successWithData(data));
  }
}

module.exports = EncryptionSaltCache;
