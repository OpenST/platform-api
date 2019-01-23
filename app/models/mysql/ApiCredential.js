'use strict';

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  kms = require(rootPrefix + '/lib/globalConstant/kms'),
  encryptionPurpose = kms.clientValidationPurpose,
  ModelBase = require(rootPrefix + '/app/models/mysql/Base');

const dbName = 'kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

class ApiCredential extends ModelBase {
  constructor() {
    super({ dbName: dbName });
    const oThis = this;
    oThis.tableName = 'api_credentials';
  }

  /***
   *
   * @param apiKey
   * @return {Object}
   */
  fetchByApiKey(apiKey) {
    const oThis = this;
    return oThis
      .select(['client_id', 'api_key', 'api_secret', 'api_salt', 'expiry_timestamp'])
      .where({ api_key: apiKey })
      .fire();
  }

  static get encryptionPurpose() {
    return encryptionPurpose;
  }
}

module.exports = ApiCredential;
