/**
 * Model for token extx worker processes table.
 *
 * @module app/models/mysql/TokenExtxWorkerProcesses
 */

const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

// Declare variables.
const dbName = 'saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

/**
 * Class for token address model.
 *
 * @class TokenExtxWorkerProcesses
 */
class TokenExtxWorkerProcesses extends ModelBase {
  /**
   * Constructor for token address model.
   *
   * @augments ModelBase
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'token_extx_worker_processes';
  }
}

module.exports = TokenExtxWorkerProcesses;
