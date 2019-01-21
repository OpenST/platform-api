'use strict';

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  kms = require(rootPrefix + '/lib/globalConstant/kms'),
  encryptionPurpose = kms.managedAddressPurpose,
  ModelBase = require(rootPrefix + '/app/models/mysql/Base');

const dbName = 'saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

class KnownAddress extends ModelBase {
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'known_addresses';
  }

  getByAddressesSecure(addresses) {
    const oThis = this;

    return oThis
      .select(['address', 'encryption_salt', 'private_key'])
      .where(['address IN (?)', addresses])
      .fire();
  }

  /***
   *
   * @param {Object} params
   * @param {String} params.ethAddress
   * @param {String} params.privateKeyE
   * @param {String} params.addressSalt
   *
   * @param params
   */
  insertAddress(params) {
    const oThis = this;

    return oThis
      .insert({
        address: params.ethAddress.toLowerCase(),
        private_key: params.privateKeyE,
        encryption_salt: params.addressSalt
      })
      .fire();
  }

  static get encryptionPurpose() {
    return encryptionPurpose;
  }
}

module.exports = KnownAddress;
