'use strict';

const rootPrefix = '..',
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  KnownAddressModel = require(rootPrefix + '/app/models/mysql/KnownAddress'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConst = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  KmsWrapper = require(rootPrefix + '/lib/authentication/kmsWrapper'),
  localCipher = require(rootPrefix + '/lib/encryptors/localCipher'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  AddressPrivateKeyCache = require(rootPrefix + '/lib/sharedCacheManagement/AddressPrivateKey'),
  AddressesEncryptor = require(rootPrefix + '/lib/encryptors/AddressesEncryptor'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  GeneratePrivateKey = require(rootPrefix + '/tools/helpers/GeneratePrivateKey');

class GenerateKnownAddress {
  /**
   * Generate known address klass
   *
   * If Address & Passphrase is passed insert in db else generate a fresh pair and then insert
   *
   * @constructor
   *
   * @param {object} params - external passed parameters
   * @param {number} params.addressType - type of address
   * @param {number} [params.clientId] - client id for whom users are to be created.
   * @param {number} [params.address] - address to be used
   * @param {number} [params.privateKey] - private key to be used
   *
   */
  constructor(params) {
    const oThis = this;

    if (!params) {
      params = {};
    }

    oThis.addressType = params['addressType'];
    oThis.clientId = params['clientId'];
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

    await oThis.generatePrivateKey();

    const KMSObject = new KmsWrapper('knownAddresses'),
      newKey = await KMSObject.generateDataKey(),
      addressSaltE = newKey['CiphertextBlob'],
      addressSaltD = newKey['Plaintext'].toString('hex');

    oThis.privateKeyE = await new AddressesEncryptor({ encryptionSaltD: addressSaltD }).encrypt(oThis.privateKeyD);

    let insertRsp = await oThis.insertKnownAddress(addressSaltE);

    await oThis.insertChainAddress(insertRsp.data['known_address_id']);

    new AddressPrivateKeyCache({ address: oThis.ethAddress }).clear();

    return Promise.resolve(
      responseHelper.successWithData({
        address: oThis.ethAddress
      })
    );
  }

  async validate() {
    const oThis = this;

    let errors_object = [];

    if (
      (!oThis.clientId || oThis.clientId === '') &&
      chainAddressConst.clientIdMandatoryForAddressTypes.indexOf(oThis.addressType) > -1
    ) {
      errors_object.push('missing_client_id');
    }

    if (errors_object.length > 0) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'l_gka_2',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: errors_object,
          debug_options: {}
        })
      );
    }
  }

  /**
   *
   * generate key if required
   *
   * @private
   *
   * @return {Result}
   */
  async generatePrivateKey() {
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
  async insertKnownAddress(addressSalt) {
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

    return responseHelper.successWithData({ known_address_id: insertedRec.insertId });
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
  async insertChainAddress(knownAddressId) {
    const oThis = this,
      configStrategy = oThis.ic().configStrategy;

    const insertedRec = await new ChainAddressModel()
      .insert({
        chain_id: configStrategy[configStrategyConstants.auxGeth]['chainId'],
        kind: chainAddressConst.invertedAddressTypes[oThis.addressType],
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

    return responseHelper.successWithData({ chain_address_id: insertedRec.id });
  }
}

InstanceComposer.registerAsShadowableClass(GenerateKnownAddress, coreConstants.icNameSpace, 'GenerateKnownAddress');

module.exports = GenerateKnownAddress;
