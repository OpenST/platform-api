'use strict';

const rootPrefix = '..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  KnownAddressModel = require(rootPrefix + '/app/models/mysql/KnownAddress'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConst = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  KmsWrapper = require(rootPrefix + '/lib/authentication/KmsWrapper'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  AddressPrivateKeyCache = require(rootPrefix + '/lib/sharedCacheManagement/AddressPrivateKey'),
  AddressesEncryptor = require(rootPrefix + '/lib/encryptors/AddressesEncryptor'),
  GeneratePrivateKey = require(rootPrefix + '/tools/helpers/GeneratePrivateKey');

class GenerateChainKnownAddress {
  /**
   * Generate known address klass
   *
   * If Address & Passphrase is passed insert in db else generate a fresh pair and then insert
   *
   * @constructor
   *
   * @param {object} params - external passed parameters
   * @param {string} params.addressKind - type of address
   * @param {string} params.chainKind - chain kind
   * @param {number} params.chainId - chain id
   * @param {number} [params.address] - address to be used
   * @param {number} [params.privateKey] - private key to be used
   *
   */
  constructor(params) {
    const oThis = this;

    if (!params) {
      params = {};
    }

    oThis.chainKind = params['chainKind'];
    oThis.addressKind = params['addressKind'];
    oThis.chainId = params['chainId'];
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
          internal_error_identifier: 'l_gka_1',
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

    const KMSObject = new KmsWrapper('knownAddresses'),
      newKey = await KMSObject.generateDataKey(),
      addressSaltE = newKey['CiphertextBlob'],
      addressSaltD = newKey['Plaintext'].toString('hex');

    oThis.privateKeyE = await new AddressesEncryptor({ encryptionSaltD: addressSaltD }).encrypt(oThis.privateKeyD);

    let insertRsp = await oThis._insertKnownAddress(addressSaltE);

    await oThis._insertChainAddress(insertRsp.data['knownAddressId']);

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

    const insertedRec = await new KnownAddressModel()
      .insert({
        address: oThis.ethAddress,
        private_key: oThis.privateKeyE,
        encryption_salt: addressSalt
      })
      .fire();

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
   * insert chain address
   *
   * @private
   *
   * @param {number} knownAddressId
   *
   * @return {Result}
   */
  async _insertChainAddress(knownAddressId) {
    const oThis = this;

    const insertedRec = await new ChainAddressModel()
      .insert({
        chain_id: oThis.chainId,
        kind: chainAddressConst.invertedKinds[oThis.addressKind],
        chain_kind: chainAddressConst.invertedChainKinds[oThis.chainKind],
        address: oThis.ethAddress,
        known_address_id: knownAddressId
      })
      .fire();

    if (insertedRec.affectedRows == 0) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_a_g_4',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return responseHelper.successWithData({ chainAddressId: insertedRec.id });
  }
}

module.exports = GenerateChainKnownAddress;
