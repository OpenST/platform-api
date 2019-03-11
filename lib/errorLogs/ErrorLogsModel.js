/**
 * Model for error logs table.
 *
 * @module lib/errorLogs/ErrorLogsModel
 */

const rootPrefix = '../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base');

const dbName = 'ost_infra';

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
