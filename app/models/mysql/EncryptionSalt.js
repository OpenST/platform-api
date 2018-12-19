'use strict';

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base');

const dbName = 'saas_big_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

class EncryptionSalt extends ModelBase {
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'encryption_salts';
  }

  getById(id) {
    const oThis = this;
    return oThis
      .select('*')
      .where(['id=?', id])
      .fire();
  }
}

module.exports = EncryptionSalt;
