'use strict';

/**
 * Model for transaction finalizer tasks
 *
 * @module app/models/mysql/TransactionFinalizerTask
 */
const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  txFinalizerTaskConst = require(rootPrefix + '/lib/globalConstant/transactionFinalizerTask'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base');

const dbName = 'saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

let invertedStatuses = null;

class TransactionFinalizerTaskModel extends ModelBase {
  /**
   * Constructor for Currency Conversion Rate Model
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'transaction_finalizer_tasks';
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
        status: oThis.invertedStatuses[txFinalizerTaskConst.pendingStatus],
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
  pendingFinalizerTasks(chainId, blockNumber) {
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

  /**
   * Mark task as failed
   *
   * @param id
   * @param debug_params
   * @return {*|void}
   */
  markTaskFailed(id, debug_params) {
    const oThis = this;

    return oThis
      .update({
        status: oThis.invertedStatuses[txFinalizerTaskConst.failedStatus],
        debug_params: JSON.stringify(debug_params)
      })
      .where({
        id: id
      })
      .fire();
  }
}

module.exports = TransactionFinalizerTaskModel;
