'use strict';

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base');

const dbName = 'kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

class StakerWhitelistedAddress extends ModelBase {
  constructor() {
    super({ dbName: dbName });
    const oThis = this;
    oThis.tableName = 'staker_whitelisted_addresses';
  }
}

module.exports = StakerWhitelistedAddress;
