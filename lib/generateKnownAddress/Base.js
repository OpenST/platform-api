'use strict';
/**
 *
 *  Base to generate addresses
 *
 * @module lib/generateKnownAddress/base
 */

const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  KmsWrapper = require(rootPrefix + '/lib/authentication/KmsWrapper'),
  KnownAddressModel = require(rootPrefix + '/app/models/mysql/KnownAddress'),
  GeneratePrivateKey = require(rootPrefix + '/tools/helpers/GeneratePrivateKey'),
  AddressesEncryptor = require(rootPrefix + '/lib/encryptors/AddressesEncryptor'),
  AddressPrivateKeyCache = require(rootPrefix + '/lib/sharedCacheManagement/AddressPrivateKey');

/**
 *  Base class to generate addresses.
 *
 * @class
 */
class GenerateAddressBase {
  /**
   * Generate Address Base Class
   *
   * If Address & Passphrase is passed insert in db else generate a fresh pair and then insert
   *
   * @constructor
   *
   * @param {object} params - external passed parameters
   * @param {string} params.addressKind - type of address
   * @param {number} [params.address] - address to be used
   * @param {number} [params.privateKey] - private key to be used
   *
   */
  constructor(params) {
    const oThis = this;

    if (!params) {
      params = {};
    }

    oThis.addressKind = params['addressKind'];
    oThis.ethAddress = params['address'];
    oThis.privateKeyD = params['privateKey'];

    oThis.privateKeyE = null;
  }

  /**
   *
   * async Perform
   *
   * @return {Promise<*>}
   */
  async perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error(`${__filename}::perform::catch`);
        logger.error(error);

        return responseHelper.error({
          internal_error_identifier: 'l_gka_b_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   *
   * async Perform
   *
   * @return {Promise<*>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis.validate();

    await oThis._generatePrivateKey();

    const KMSObject = new KmsWrapper(KnownAddressModel.encryptionPurpose),
      newKey = await KMSObject.generateDataKey(),
      addressSaltE = newKey['CiphertextBlob'],
      addressSaltD = newKey['Plaintext'].toString('hex');

    oThis.privateKeyE = await new AddressesEncryptor({ encryptionSaltD: addressSaltD }).encrypt(oThis.privateKeyD);

    let insertRsp = await oThis._insertKnownAddress(addressSaltE);

    await oThis.insertIntoTable(insertRsp.data['knownAddressId']);

    new AddressPrivateKeyCache({ address: oThis.ethAddress }).clear();

    return Promise.resolve(
      responseHelper.successWithData({
        [oThis.addressKind]: oThis.ethAddress
      })
    );
  }

  async validate() {}

  /**
   *
   * generate key if required
   *
   * @private
   *
   * @return {Result}
   */
  async _generatePrivateKey() {
    const oThis = this;

    if (oThis.privateKeyD && oThis.ethAddress) {
      return responseHelper.successWithData({});
    }

    let resp = new GeneratePrivateKey().perform();

    oThis.ethAddress = resp.data['address'];
    oThis.privateKeyD = resp.data['privateKey'];

    return resp;
  }

  /**
   *
   * insert known address
   *
   * @private
   *
   * @param {string} addressSalt
   *
   * @return {Result}
   */
  async _insertKnownAddress(addressSalt) {
    const oThis = this;

    const insertedRec = await new KnownAddressModel().insertAddress({
      ethAddress: oThis.ethAddress,
      privateKeyE: oThis.privateKeyE,
      addressSalt: addressSalt
    });

    if (insertedRec.affectedRows == 0) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_a_g_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return responseHelper.successWithData({ knownAddressId: insertedRec.insertId });
  }

  /**
   *
   * @returns {Promise<void>}
   */
  async insertIntoTable() {
    throw 'It should be implemented by base class';
  }
}

module.exports = GenerateAddressBase;
