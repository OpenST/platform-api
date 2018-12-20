'use strict';

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
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
}

module.exports = KnownAddress;
