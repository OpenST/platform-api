'use strict';
/**
 * This is model for transaction_by_type_graph.
 *
 * @module app/models/mysql/TransactionByTypeGraph
 */
const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

// Declare variables.
const dbName = coreConstants.OST_ANALYTICS_MYSQL_DB;

/**
 * Class for TransactionByTypeGraph.
 *
 * @class
 */
class TransactionByTypeGraph extends ModelBase {
  /**
   * Constructor
   *
   * @augments ModelBase
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });
    const oThis = this;
    oThis.tableName = 'aux_transaction_by_type_graph';
  }
}

module.exports = TransactionByTypeGraph;
