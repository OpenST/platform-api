'use strict';
/**
 * This is model for workflow_setup table.
 *
 * @module app/models/mysql/TxCronProcessDetail
 */
const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

// Declare variables.
const dbName = 'saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

/**
 * Class for token address model
 *
 * @class
 */
class TxCronProcessDetail extends ModelBase {
  /**
   * Constructor for token address model
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'tx_cron_process_details';
  }
}

module.exports = TxCronProcessDetail;
