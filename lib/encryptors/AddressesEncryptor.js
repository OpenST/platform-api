'use strict';

/**
 * Encrypt / decrypt addresses
 *
 * @module lib/encryptors/addressesEncryptor
 */

const crypto = require('crypto'),
  algorithm = 'aes-256-cbc',
  rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  localCipher = require(rootPrefix + '/lib/encryptors/localCipher');

class AddressEncryptorKlass {
  /**
   *
   * @param {Object} params - this is object with keys.
   *                  encryptionSaltId - Id whose salt will be used for encryption.
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.encryptionSaltE = params['encryptionSaltE'];
    oThis.encryptionSaltD = params['encryptionSaltD'];
  }

  /**
   * Encrypt<br><br>
   *
   * @params dataToEncrypt - Data to encrypt.
   *
   * @return {Promise<String>} - returns a Promise with an encrypted string.
   *
   */
  async encrypt(dataToEncrypt) {
    const oThis = this;

    if (!oThis.encryptionSaltD) oThis._decryptAddressSalt();

    let encrypt = crypto.createCipher(algorithm, oThis.encryptionSaltD);
    let theCipher = encrypt.update(dataToEncrypt, 'utf8', 'hex');
    theCipher += encrypt.final('hex');

    return Promise.resolve(theCipher);
  }

  /**
   * Decrypt<br><br>
   *
   * @params encryptedData - Data to decrypt.
   *
   * @return {Promise<String>} - returns a Promise with a Decrypted String.
   *
   */
  async decrypt(encryptedData) {
    const oThis = this;

    if (!oThis.encryptionSaltD) oThis._decryptAddressSalt();

    let decipher = crypto.createDecipher(algorithm, oThis.encryptionSaltD);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');

    decrypted += decipher.final('utf8');

    return Promise.resolve(decrypted);
  }

  /**
   * Fetch Decrypted Address Salt<br><br>
   *
   * @ignore
   *
   * @return {Promise<Result>} - returns a Promise with a decrypted salt.
   *
   */
  async _decryptAddressSalt() {
    const oThis = this;
    oThis.encryptionSaltD = localCipher.decrypt(coreConstants.CACHE_SHA_KEY, oThis.encryptionSaltE);
    return Promise.resolve(responseHelper.successWithData({}));
  }
}

module.exports = AddressEncryptorKlass;
