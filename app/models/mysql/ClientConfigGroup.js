'use strict';

/**
 * Model to get client config strategy details.
 *
 * @module /app/models/mysql/ClientConfigGroup
 */

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base');

const dbName = 'saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

class ClientConfigGroups extends ModelBase {
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'client_config_groups';
  }
}

module.exports = ClientConfigGroups;
