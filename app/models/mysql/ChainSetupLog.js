'use strict';

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base');

const dbName = 'saas_big_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

class ChainSetupLog extends ModelBase {
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'chain_setup_logs';
  }
}

module.exports = ChainSetupLog;
