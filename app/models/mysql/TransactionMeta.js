'use strict';

const rootPrefix = '../../..',
  util = require(rootPrefix + '/lib/util'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  //LockableBaseKlass = require(rootPrefix + '/app/models/lockable_base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
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
      .select('id, transaction_hash')
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
    const oThis = this,
      whereClause = {},
      dataToUpdate = {
        lock_id: null,
        status: transactionMetaConst.invertedStatuses[params.status]
      };

    if (params.lockId) {
      whereClause.lock_id = params.lockId;
    } else if (params.id) {
      whereClause.id = params.id;
    } else {
      throw 'no param for where clause';
    }

    if (params.transactionHash) {
      dataToUpdate.transaction_hash = params.transactionHash;
    }

    if (params.senderAddress) {
      dataToUpdate.sender_address = params.senderAddress;
    }

    if (params.senderNonce) {
      dataToUpdate.sender_nonce = params.senderNonce;
    }

    if (params.debugParams) {
      dataToUpdate.debug_params = JSON.stringify(params.debugParams);
    }

    return oThis
      .update(dataToUpdate)
      .where(whereClause)
      .fire();
  }

  markAsQueuedFailed(transactionUuid) {
    const oThis = this;
    return oThis
      .update(['status=?', transactionMetaConst.invertedStatuses[transactionMetaConst.queuedFailedStatus]])
      .where({ transaction_uuid: transactionUuid })
      .fire();
  }

  markAsRollbackNeededById(id) {
    const oThis = this;
    return oThis
      .update([
        'lock_id = null, status=?',
        transactionMetaConst.invertedStatuses[transactionMetaConst.rollBackBalanceStatus]
      ])
      .where({ id: id })
      .fire();
  }

  markAsGethDownById(id) {
    const oThis = this;
    return oThis
      .update(['lock_id = null, status=?', transactionMetaConst.invertedStatuses[transactionMetaConst.gethDownStatus]])
      .where({ id: id })
      .fire();
  }

  /**
   * Mark transaction failed
   * @param id
   * @param failStatus
   * @param debug_params
   * @return {*|void}
   */
  markFailed(id, failStatus, debug_params) {
    const oThis = this;

    return oThis
      .update({
        lock_id: null,
        status: transactionMetaConst.invertedStatuses[failStatus],
        debug_params: debug_params
      })
      .where({ id: id })
      .fire();
  }

  /**
   * This function return the highest nonce for sessionAddress from Tx Meta table
   *
   * @param sessionAddress
   * @return {void|*}
   */
  async getSessionNonce(sessionAddress) {
    const oThis = this;

    let statuses = [
      transactionMetaConst.invertedStatuses[transactionMetaConst.submittedToGethStatus],
      transactionMetaConst.invertedStatuses[transactionMetaConst.queuedStatus],
      transactionMetaConst.invertedStatuses[transactionMetaConst.minedStatus],
      transactionMetaConst.invertedStatuses[transactionMetaConst.finalizationInProcess],
      transactionMetaConst.invertedStatuses[transactionMetaConst.finalizedStatus]
    ];

    let dbRows = await oThis
      .select('session_address, session_nonce')
      .where(['session_address = ? AND status IN (?)', sessionAddress, statuses])
      .order_by('session_nonce DESC')
      .limit(1)
      .fire();

    if (dbRows.length === 0) {
      return responseHelper.successWithData({});
    }

    return responseHelper.successWithData({
      address: dbRows[0].session_address,
      nonce: dbRows[0].session_nonce
    });
  }
}

module.exports = TransactionMetaModel;
