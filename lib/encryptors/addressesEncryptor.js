'use strict';

/**
 * Encrypt Ethereum addresses of users using address salt of client
 *
 * @module lib/encryptors/address_encryptor
 */

const crypto = require('crypto'),
  algorithm = 'aes-256-cbc',
  rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  localCipher = require(rootPrefix + '/lib/encryptors/localCipher'),
  ManagedAddressSaltCacheKlass = require(rootPrefix + '/lib/sharedCacheManagement/managedAddressesSalt');

/**
 * Fetch Transaction Receipt for the given transaction Hash
 *
 * @param {object} params - this is object with keys.
 *                  managedAddressSaltId - Id whose salt will be used for encryption.
 *
 * @constructor
 */
const AddressEncryptorKlass = function(params) {
  const oThis = this;

  oThis.managedAddressSaltId = params['managedAddressSaltId'];
};

AddressEncryptorKlass.prototype = {
  /**
   * Encrypt<br><br>
   *
   * @params dataToEncrypt - Data to encrypt.
   *
   * @return {Promise<String>} - returns a Promise with an encrypted string.
   *
   */
  encrypt: async function(dataToEncrypt) {
    const oThis = this;

    let response = await oThis._fetchAddressSalt(oThis.managedAddressSaltId);

    if (response.isFailure()) {
      return Promise.resolve(null);
    }

    let encrypt = crypto.createCipher(algorithm, response.data.addressSalt);
    let theCipher = encrypt.update(dataToEncrypt, 'utf8', 'hex');
    theCipher += encrypt.final('hex');

    return Promise.resolve(theCipher);
  },

  /**
   * Decrypt<br><br>
   *
   * @params encryptedData - Data to decrypt.
   *
   * @return {Promise<String>} - returns a Promise with a Decrypted String.
   *
   */
  decrypt: async function(encryptedData) {
    const oThis = this;

    let response = await oThis._fetchAddressSalt(oThis.managedAddressSaltId);

    if (response.isFailure()) {
      return Promise.resolve(null);
    }

    let decipher = crypto.createDecipher(algorithm, response.data.addressSalt);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return Promise.resolve(decrypted);
  },

  /**
   * Fetch Decrypted Client Address Salt<br><br>
   *
   * @return {Promise<Result>} - returns a Promise with a decrypted salt.
   *
   */
  _fetchAddressSalt: async function() {
    const oThis = this;

    let obj = new ManagedAddressSaltCacheKlass({ id: oThis.managedAddressSaltId });

    let cachedResp = await obj.fetch();
    if (cachedResp.isFailure()) {
      return Promise.resolve(cachedResp);
    }
    let salt = localCipher.decrypt(coreConstants.CACHE_SHA_KEY, cachedResp.data.addressSalt);
    return Promise.resolve(responseHelper.successWithData({ addressSalt: salt }));
  }
};

module.exports = AddressEncryptorKlass;
