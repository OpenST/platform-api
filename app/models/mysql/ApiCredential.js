'use strict';
/**
 * @file - Model for api_credentials table
 */
const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  kms = require(rootPrefix + '/lib/globalConstant/kms'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

const encryptionPurpose = kms.clientValidationPurpose;

const dbName = 'kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

class ApiCredentialModel extends ModelBase {
  /**
   * API Credentials model
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'api_credentials';
  }

  /***
   * Fetch credentials for API key
   *
   * @param apiKey {string} - API key
   *
   * @return {Object}
   */
  fetchByApiKey(apiKey) {
    const oThis = this;
    return oThis
      .select(['client_id', 'api_key', 'api_secret', 'api_salt', 'expiry_timestamp'])
      .where({ api_key: apiKey })
      .fire();
  }

  /**
   * Encryption purpose
   *
   * @return {string}
   */
  static get encryptionPurpose() {
    return encryptionPurpose;
  }
}

module.exports = ApiCredentialModel;
