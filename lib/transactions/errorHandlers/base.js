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

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/custom_console_logger'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
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

class MarkFailAndRollbackBalanceKlass {
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

  async setConfigStrategies() {
    const oThis = this;

    if (oThis.tokenIds.length <= 0) {
      return Promise.resolve({});
    }

    let tokensData = await new TokenModel().select('id, client_id').where(['id in (?)', oThis.tokenIds]);
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

  async setPendingTxForFailedUuids(txUuids) {
    const oThis = this;

    if (!oThis.pendingTransactionsMap) {
      let fetchPendingTxRsp = await new FetchPendingTransactionsByUuid(oThis.auxChainId, txUuids).perform();

      oThis.pendingTransactionsMap = fetchPendingTxRsp.data;
    }
  }

  markPendingTransactionFail() {
    const oThis = this;

    if (oThis.transactionUuidsToBeFailed.length <= 0) {
      return Promise.resolve({});
    }

    let promisesArray = [];
    for (let i = 0; i < oThis.transactionUuidsToBeFailed.length; i++) {
      let transactionUuid = oThis.transactionUuidsToBeFailed[i];
      let promise = new PendingTransactionCrud(oThis.chainId)
        .update({
          transactionUuid: transactionUuid,
          status: pendingTransactionConstants.failedStatus
        })
        .then(function() {
          oThis.failMarkedTransactionUuids.push(transactionUuid);
        })
        .catch(function() {
          // Do nothing
        });
      promisesArray.push(promise);
    }
    return Promise.all(promisesArray);
  }

  releaseLockAndMarkTransactionMetaFail() {
    const oThis = this;

    if (oThis.failMarkedTransactionUuids.length <= 0) {
      return Promise.resolve({});
    }

    return new TransactionMetaModel()
      .update({
        lock_id: null,
        status: transactionMetaConst.invertedStatuses[transactionMetaConst.finalFailedStatus],
        next_action_at: null
      })
      .where({
        lock_id: oThis.lockId,
        transactionUuid: oThis.failMarkedTransactionUuids
      })
      .fire();
  }

  /**
   *
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
    const oThis = this,
      TokenShardNumbersCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenShardNumbersCache');

    if (oThis.tokenToBalanceShardNumberMap[tokenId]) {
      return oThis.tokenToBalanceShardNumberMap[tokenId];
    }

    let response = await new TokenShardNumbersCache({ tokenId: tokenId }).fetch();

    let balanceShardNumber = response.data[entityConst.balanceEntityKind];

    if (!balanceShardNumber) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_t_eh_6',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            shards: response.data
          }
        })
      );
    }

    oThis.tokenToBalanceShardNumberMap[tokenId] = balanceShardNumber;
    return oThis.tokenToBalanceShardNumberMap[tokenId];
  }
}

module.exports = MarkFailAndRollbackBalanceKlass;
