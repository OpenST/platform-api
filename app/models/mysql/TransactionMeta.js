'use strict';

const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
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
   * Fetch records by txHashes
   *
   * @param chainId
   * @param transactionHashes
   * @return {Object}
   */
  fetchByTransactionHashes(chainId, transactionHashes) {
    const oThis = this;

    return oThis
      .select('id,status,receipt_status,transaction_uuid,transaction_hash,token_id')
      .where(['associated_aux_chain_id = ? and transaction_hash IN (?)', chainId, transactionHashes])
      .fire();
  }

  /**
   *
   * without Releasing lock update record (s)
   *
   * @param params data to be updated
   *
   * @return {Promise}
   */
  updateRecordsWithoutReleasingLock(params) {
    const oThis = this;

    let queryObj = oThis._generateUpdateQueryObj(params, false);

    return queryObj.fire();
  }

  /**
   * Release lock and update record (s)
   *
   * @param params data to be updated
   *
   * @return {Promise}
   */
  updateRecordsByReleasingLock(params) {
    const oThis = this;

    let queryObj = oThis._generateUpdateQueryObj(params, true);

    return queryObj.fire();
  }

  /**
   *
   * @param params
   * @param releaseLock
   *
   * @private
   *
   * @return {Object<self>|*}
   */
  _generateUpdateQueryObj(params, releaseLock) {
    const oThis = this,
      dataToUpdate = {
        status: transactionMetaConst.invertedStatuses[params.status]
      };

    if (releaseLock) {
      dataToUpdate.lock_id = null;
    }

    if (params.transactionHash) {
      dataToUpdate.transaction_hash = params.transactionHash;
    }

    if (params.senderAddress) {
      dataToUpdate.sender_address = params.senderAddress;
    }

    if (params.hasOwnProperty('senderNonce')) {
      dataToUpdate.sender_nonce = params.senderNonce;
    }

    if (params.debugParams) {
      dataToUpdate.debug_params = JSON.stringify(params.debugParams);
    }

    if (transactionMetaConst.nextActionAtDelta[params.status]) {
      dataToUpdate.next_action_at = transactionMetaConst.getNextActionAtFor(params.status);
    } else {
      dataToUpdate.next_action_at = null;
    }

    if (params.receiptStatus) {
      dataToUpdate.receipt_status = transactionMetaConst.invertedReceiptStatuses[params.receiptStatus];
    }

    let queryObj = oThis.update(dataToUpdate);
    if (params.hasOwnProperty('increseRetryCount')) {
      queryObj = queryObj.update(['retry_count = retry_count+1']);
    }

    if (params.lockId) {
      queryObj = queryObj.where({ lock_id: params.lockId });
    } else if (params.id) {
      queryObj = queryObj.where({ id: params.id });
    } else if (params.transactionHashes && params.chainId) {
      queryObj = queryObj
        .where({ associated_aux_chain_id: params.chainId })
        .where(['transaction_hash IN (?)', params.transactionHashes]);
    } else if (params.ids) {
      queryObj = queryObj.where(['id IN (?)', params.ids]);
    } else if (params.transactionHash && params.chainId) {
      queryObj = queryObj.where({ transaction_hash: params.transactionHash, associated_aux_chain_id: params.chainId });
    } else {
      throw 'no param for where clause';
    }

    return queryObj;
  }

  /**
   * This function return the highest nonce for sessionAddress from Tx Meta table
   *
   * @param chainId
   * @param sessionAddress
   * @return {void|*}
   */
  async getSessionNonce(chainId, sessionAddress) {
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
      .where({ associated_aux_chain_id: chainId })
      .where([
        'receipt_status != ?',
        transactionMetaConst.invertedReceiptStatuses[transactionMetaConst.failureReceiptStatus]
      ])
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
