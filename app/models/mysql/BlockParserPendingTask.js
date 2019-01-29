'use strict';
/**
 * Model to get currency conversion details.
 *
 * @module app/models/mysql/CurrencyConversionRate
 */
const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base');

const dbName = 'saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

class BlockParserPendingTaskModel extends ModelBase {
  /**
   * Constructor for Currency Conversion Rate Model
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'block_parser_pending_tasks';
  }

  /**
   * Insert Pending task of block parser
   *
   * @param chainId
   * @param blockNumber
   * @param transactionHashes
   * @return
   */
  insertTask(chainId, blockNumber, transactionHashes) {
    const oThis = this;

    return oThis
      .insert({
        chain_id: chainId,
        block_number: blockNumber,
        transaction_hashes: JSON.stringify(transactionHashes)
      })
      .fire();
  }

  /**
   *
   * Fetch pending tasks for block parser
   *
   * @param chainId
   * @param blockNumber
   *
   * @return
   */
  pendingBlockTasks(chainId, blockNumber) {
    const oThis = this;

    return oThis
      .select('*')
      .where({
        chain_id: chainId,
        block_number: blockNumber
      })
      .fire();
  }

  /**
   *
   * Fetch pending tasks for block parser
   *
   * @param id
   *
   * @return
   */
  fetchTask(id) {
    const oThis = this;

    return oThis
      .select('*')
      .where({
        id: id
      })
      .fire();
  }

  /**
   *
   * Delete task which has been worked on.
   *
   * @param id
   *
   * @return
   */
  deleteTask(id) {
    const oThis = this;

    return oThis
      .delete()
      .where({
        id: id
      })
      .fire();
  }
}

module.exports = BlockParserPendingTaskModel;
