/**
 * Model for error logs table.
 *
 * @module app/models/mysql/ErrorLogsModel
 */

const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

// Declare variables.
const dbName = coreConstants.OST_INFRA_MYSQL_DB;

/**
 * Class for error logs model.
 *
 * @class ErrorLogs
 */
class ErrorLogs extends ModelBase {
  /**
   * Constructor for error logs model.
   *
   * @augments ModelBase
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'error_logs';
  }
}

module.exports = ErrorLogs;
