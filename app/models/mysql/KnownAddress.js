'use strict';

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  knownAddressConstant = require(rootPrefix + '/lib/globalConstant/knownAddress');

const dbName = 'saas_big_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

class KnownAddress extends ModelBase {
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'known_addresses';
  }
}

module.exports = KnownAddress;
