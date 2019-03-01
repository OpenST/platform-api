'use strict';
/**
 * Mark fail and revert pessimistic balance.
 * This class the array of Tx Meta rows as input.
 *
 * @module lib/transactionErrorHandlers/queuedHandler
 */

const BigNumber = require('bignumber.js');
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  TransactionMetaModel = require(rootPrefix + '/app/models/mysql/TransactionMeta'),
  transactionMetaConst = require(rootPrefix + '/lib/globalConstant/transactionMeta'),
  FetchPendingTransactionsByUuid = require(rootPrefix + '/lib/transactions/FetchPendingTransactionsByUuid'),
  entityConst = require(rootPrefix + '/lib/globalConstant/shard'),
  TokenModel = require(rootPrefix + '/app/models/mysql/Token'),
  PendingTransactionCrud = require(rootPrefix + '/lib/transactions/PendingTransactionCrud'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  ConfigCrudByClientId = require(rootPrefix + '/helpers/configStrategy/ByClientId');

require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');
require(rootPrefix + '/app/models/ddb/sharded/Balance');

class ErrorHandlerBaseKlass {
  /**
   * constructor
   *
   * @param {object} params
   * @param {number} params.auxChainId
   * @param {decimal} params.lockId
   * @param {array} params.transactionsMetaRecords
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.lockId = params.lockId;
    oThis.transactionsMetaRecords = params.transactionsMetaRecords;

    oThis.pendingTransactionsMap = null;
    oThis.tokenIds = [];
    oThis.tokenIdToInstanceComposerMap = {};
    oThis.txUuidToTxMetaMap = {};
    oThis.tokenToBalanceShardNumberMap = {};

    oThis.transactionUuidsToBeFailed = [];
    oThis.failMarkedTransactionUuids = [];
  }

  /**
   * Main performer for the class.
   *
   * @returns {Promise}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(error) {
      logger.error('lib/transactions/errorHandlers/base.js::perform::catch');
      logger.error(error);
      return Promise.resolve({});
    });
  }

  /**
   * Validate mandatory params
   *
   * @returns {Promise}
   */
  async validate() {
    const oThis = this;
    if (!oThis.auxChainId || !oThis.lockId || oThis.transactionsMetaRecords.length <= 0) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_t_eh_b_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            auxChainId: oThis.auxChainId,
            lockId: oThis.lockId,
            transactionsMetaRecords: oThis.transactionsMetaRecords
          }
        })
      );
    }
    return {};
  }

  /**
   * Set config strategies of all applied tokenIds.
   *
   * @returns {Promise}
   */
  async setConfigStrategies() {
    const oThis = this;

    if (oThis.tokenIds.length <= 0) {
      return Promise.resolve({});
    }

    let tokensData = await new TokenModel()
      .select('id, client_id')
      .where(['id in (?)', oThis.tokenIds])
      .fire();
    let promiseArray = [];

    for (let i = 0; i < tokensData.length; i++) {
      let tokenData = tokensData[i];

      let configCrudByClientId = new ConfigCrudByClientId(tokenData.client_id);

      let promise = configCrudByClientId.get().then(function(configStrategyRsp) {
        if (configStrategyRsp.isSuccess()) {
          oThis.tokenIdToInstanceComposerMap[tokenData.id] = new InstanceComposer(configStrategyRsp.data);
        }
      });
      promiseArray.push(promise);
    }

    return Promise.all(promiseArray);
  }

  /**
   * Fetch and set pending transaction records for all passed uuids.
   *
   * @param txUuids
   * @returns {Promise<void>}
   */
  async setPendingTxForUuids(txUuids) {
    const oThis = this;

    if (!oThis.pendingTransactionsMap) {
      let fetchPendingTxRsp = await new FetchPendingTransactionsByUuid(oThis.auxChainId, txUuids).perform();

      oThis.pendingTransactionsMap = fetchPendingTxRsp.data;
    }
  }

  /**
   * Mark failed and rollback balance for fail marked uuids
   *
   * @returns {Promise}
   */
  async markFailAndRollbackBalance() {
    const oThis = this;

    if (oThis.transactionUuidsToBeFailed.length <= 0) {
      return Promise.resolve({});
    }

    await oThis._markPendingTransactionFail();

    await oThis._releaseLockAndMarkTransactionMetaFail();

    await oThis._rollBackPessimisticDebit();

    return {};
  }

  /**
   * Update pending transaction to mark transaction fail.
   *
   * @returns {Promise<[any]>}
   * @private
   */
  _markPendingTransactionFail() {
    const oThis = this;

    let promisesArray = [];
    for (let i = 0; i < oThis.transactionUuidsToBeFailed.length; i++) {
      let txUuid = oThis.transactionUuidsToBeFailed[i];
      let promise = new PendingTransactionCrud(oThis.chainId)
        .update({
          transactionUuid: txUuid,
          status: pendingTransactionConstants.failedStatus
        })
        .then(function() {
          oThis.failMarkedTransactionUuids.push(txUuid);
        })
        .catch(function() {
          // Do nothing
        });
      promisesArray.push(promise);
    }
    console.log('--oThis.failMarkedTransactionUuids-------', oThis.failMarkedTransactionUuids);
    return Promise.all(promisesArray);
  }

  /**
   * Mark fail and release lock transaction meta if pending transaction is marked fail.
   *
   * @returns {*}
   * @private
   */
  _releaseLockAndMarkTransactionMetaFail() {
    const oThis = this;

    if (oThis.failMarkedTransactionUuids.length <= 0) {
      return Promise.resolve({});
    }

    return new TransactionMetaModel()
      .update([
        'lock_id=NULL, status=?, next_action_at=NULL, retry_count=retry_count+1',
        transactionMetaConst.invertedStatuses[transactionMetaConst.finalFailedStatus]
      ])
      .where({
        lock_id: oThis.lockId,
        transactionUuid: oThis.failMarkedTransactionUuids
      })
      .fire();
  }

  /**
   * Rollback pessimistic debited balance to all fail marked transactions.
   *
   * @private
   */
  async _rollBackPessimisticDebit() {
    const oThis = this;

    if (oThis.failMarkedTransactionUuids.length <= 0) {
      return Promise.resolve({});
    }

    for (let i = 0; i < oThis.failMarkedTransactionUuids.length; i++) {
      let txUuid = oThis.failMarkedTransactionUuids[i],
        pendingTransaction = oThis.pendingTransactionsMap[txUuid],
        txMeta = oThis.txUuidToTxMetaMap[txUuid],
        ic = oThis.tokenIdToInstanceComposerMap[txMeta.token_id];

      let balanceShardNumber = oThis._setBalanceShardNumber(txMeta.token_id);

      let BalanceModel = ic.getShadowedClassFor(coreConstants.icNameSpace, 'BalanceModel'),
        balanceObj = new BalanceModel({ shardNumber: balanceShardNumber });

      let unsettledDebits = pendingTransaction.unsettledDebits,
        blockChainUnsettleDebitsBn = new BigNumber(unsettledDebits['blockChainUnsettleDebits']);

      unsettledDebits['blockChainUnsettleDebits'] = blockChainUnsettleDebitsBn.mul(-1).toString(10);

      await balanceObj.updateBalance(unsettledDebits);
    }
  }

  /**
   * Get balance shard for token id
   *
   * @private
   */
  async _setBalanceShardNumber(tokenId) {
    const oThis = this;

    if (!oThis.tokenToBalanceShardNumberMap[tokenId]) {
      let ic = oThis.tokenIdToInstanceComposerMap[tokenId],
        TokenShardNumbersCache = ic.getShadowedClassFor(coreConstants.icNameSpace, 'TokenShardNumbersCache');

      let response = await new TokenShardNumbersCache({ tokenId: tokenId }).fetch();

      let balanceShardNumber = response.data[entityConst.balanceEntityKind];

      if (!balanceShardNumber) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'l_t_eh_b_2',
            api_error_identifier: 'something_went_wrong',
            debug_options: {
              shards: response.data
            }
          })
        );
      }

      oThis.tokenToBalanceShardNumberMap[tokenId] = balanceShardNumber;
    }

    return oThis.tokenToBalanceShardNumberMap[tokenId];
  }
}

module.exports = ErrorHandlerBaseKlass;
