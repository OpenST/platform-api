'use strict';
/**
 * Model to get workflow details.
 *
 * @module /app/models/mysql/Workflow
 */
const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

// Declare variables.
const dbName = 'siege_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

/**
 * Class for workflow model.
 *
 * @class
 */
class SiegeUser extends ModelBase {
  /**
   * Constructor for workflow model.
   *
   * @augments ModelBase
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'users';
  }
}

module.exports = SiegeUser;
