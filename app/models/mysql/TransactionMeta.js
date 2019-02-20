'use strict';

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  //LockableBaseKlass = require(rootPrefix + '/app/models/lockable_base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  transactionMetaConst = require(rootPrefix + '/lib/globalConstant/transactionMeta');

const dbName = 'saas_big_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

class TransactionMetaModel extends ModelBase {
  constructor() {
    super({ dbName: dbName });
    const oThis = this;

    oThis.tableName = 'transaction_meta';
  }

  get kinds() {
    return transactionMetaConst.kinds;
  }

  get invertedKinds() {
    return transactionMetaConst.invertedKinds;
  }

  get statuses() {
    return transactionMetaConst.statuses;
  }

  get invertedStatuses() {
    return transactionMetaConst.invertedStatuses;
  }

  /**
   * Acquire lock on rows
   *
   * @param params
   * @return {*|void}
   */
  acquireLockWithTxHashes(params) {
    const oThis = this,
      currentTime = Date.now();

    return oThis
      .update({
        lock_id: params.lockId,
        status: transactionMetaConst.invertedStatuses[params.updateStatusTo]
      })
      .where([
        'transaction_hash IN (?) AND status = ? AND next_action_at < ? AND retry_count < ?',
        params.transactionHashes,
        transactionMetaConst.invertedStatuses[params.selectWithStatus],
        currentTime,
        params.retryLimit
      ])
      .fire();
  }

  /**
   * Fetch transactions by lockId
   *
   * @param lock_id
   * @return {*|void}
   */
  fetchByLockId(lock_id) {
    const oThis = this;

    return oThis
      .select('transaction_hash')
      .where({
        lock_id: lock_id
      })
      .fire();
  }

  /**
   * Release lock and mark status
   *
   * @return {*|void}
   */
  releaseLockAndMarkStatus(params) {
    const oThis = this;

    return oThis
      .update({
        lock_id: null,
        status: transactionMetaConst.invertedStatuses[params.status]
      })
      .where({
        lock_id: params.lockId
      })
      .fire();
  }

  markAsQueuedFailed(transactionUuid) {
    const oThis = this;
    return oThis
      .update(['status=?', transactionMetaConst.invertedStatuses[transactionMetaConst.queuedFailed]])
      .where({ transaction_uuid: transactionUuid })
      .fire();
  }
}

module.exports = TransactionMetaModel;
