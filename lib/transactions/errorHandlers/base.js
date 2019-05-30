/**
 * Mark fail and revert pessimistic balance.
 * This class the array of Tx Meta rows as input.
 *
 * @module lib/transactionErrorHandlers/queuedHandler
 */

const BigNumber = require('bignumber.js'),
  OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  TokenModel = require(rootPrefix + '/app/models/mysql/Token'),
  TransactionMetaModel = require(rootPrefix + '/app/models/mysql/TransactionMeta'),
  ConfigCrudByClientId = require(rootPrefix + '/helpers/configStrategy/ByClientId'),
  PendingTransactionCrud = require(rootPrefix + '/lib/transactions/PendingTransactionCrud'),
  FetchPendingTransactionsByUuid = require(rootPrefix + '/lib/transactions/FetchPendingTransactionsByUuid'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  entityConst = require(rootPrefix + '/lib/globalConstant/shard'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  preProcessorPublish = require(rootPrefix + '/lib/webhooks/preProcessorPublish'),
  transactionMetaConst = require(rootPrefix + '/lib/globalConstant/transactionMeta'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  webhookSubscriptionsConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');
require(rootPrefix + '/app/models/ddb/sharded/Balance');

/**
 * Class for error handler base.
 *
 * @class ErrorHandlerBaseKlass
 */
class ErrorHandlerBaseKlass {
  /**
   * Constructor for error handler base.
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
   * Main performer for class.
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
   * Validate mandatory params.
   *
   * @returns {Promise<Promise<Promise<never>|{}>|{}>}
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
   * @returns {Promise<Promise<[any, any, any, any, any, any, any, any, any, any]>|Promise<{}>>}
   */
  async setConfigStrategies() {
    const oThis = this;

    if (oThis.tokenIds.length <= 0) {
      return Promise.resolve({});
    }

    const tokensData = await new TokenModel()
      .select('id, client_id')
      .where(['id in (?)', oThis.tokenIds])
      .fire();

    const promiseArray = [];

    for (let index = 0; index < tokensData.length; index++) {
      const tokenData = tokensData[index];

      const configCrudByClientId = new ConfigCrudByClientId(tokenData.client_id);

      const promise = configCrudByClientId.get().then(function(configStrategyRsp) {
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
   * @param {array<string>} txUuids
   *
   * @sets oThis.pendingTransactionsMap
   *
   * @returns {Promise<void>}
   */
  async setPendingTxForUuids(txUuids) {
    const oThis = this;

    if (!oThis.pendingTransactionsMap) {
      const fetchPendingTxRsp = await new FetchPendingTransactionsByUuid(oThis.auxChainId, txUuids).perform();

      oThis.pendingTransactionsMap = fetchPendingTxRsp.data;
    }
  }

  /**
   * Mark failed and rollback balance for fail marked uuids.
   *
   * @returns {Promise<{}|Promise<{}>>}
   */
  async markFailAndRollbackBalance() {
    const oThis = this;

    if (oThis.transactionUuidsToBeFailed.length <= 0) {
      return Promise.resolve({});
    }

    await oThis._markPendingTransactionFailAndSendPreprocessorWebhook();

    await oThis._releaseLockAndMarkTransactionMetaFail();

    await oThis._rollBackPessimisticDebit();

    return {};
  }

  /**
   * Update pending transaction to mark transaction fail and send preprocessor webhook.
   *
   * @returns {Promise<[any]>}
   * @private
   */
  async _markPendingTransactionFailAndSendPreprocessorWebhook() {
    const oThis = this;

    const promisesArray = [];

    for (let index = 0; index < oThis.transactionUuidsToBeFailed.length; index++) {
      const txUuid = oThis.transactionUuidsToBeFailed[index];

      const txMeta = oThis.txUuidToTxMetaMap[txUuid],
        tokenId = txMeta.token_id;

      // Send webhookPreprocessor payload.
      const webhookPreprocessorPayload = oThis.webhookPreprocessorPayload(txUuid, tokenId);

      const webhookProcessorPromise = preProcessorPublish.perform(oThis.auxChainId, webhookPreprocessorPayload);

      promisesArray.push(webhookProcessorPromise);

      const promise = new PendingTransactionCrud(oThis.auxChainId)
        .update({
          transactionUuid: txUuid,
          status: pendingTransactionConstants.failedStatus
        })
        .then(function() {
          oThis.failMarkedTransactionUuids.push(txUuid);
        })
        .catch(function(err) {
          logger.error('Update pending transaction failed..', err);
          // Do nothing
        });
      promisesArray.push(promise);
    }
    logger.info('--oThis.failMarkedTransactionUuids-------', oThis.failMarkedTransactionUuids);

    return Promise.all(promisesArray);
  }

  /**
   * Create payload for webhook Preprocessor queue.
   *
   * @param {string} transactionUuid
   * @param {string} tokenId
   *
   * @returns {{webhookKind: string, transactionUuid: string, tokenId: string}}
   */
  webhookPreprocessorPayload(transactionUuid, tokenId) {
    return {
      webhookKind: webhookSubscriptionsConstants.transactionsFailureTopic,
      tokenId: tokenId,
      transactionUuid: transactionUuid
    };
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
      .where(['lock_id=? AND transaction_uuid in (?)', oThis.lockId, oThis.failMarkedTransactionUuids])
      .fire();
  }

  /**
   * Rollback pessimistic debited balance to all fail marked transactions.
   *
   * @returns {Promise<{}>}
   * @private
   */
  async _rollBackPessimisticDebit() {
    const oThis = this;

    if (oThis.failMarkedTransactionUuids.length <= 0) {
      return Promise.resolve({});
    }

    for (let index = 0; index < oThis.failMarkedTransactionUuids.length; index++) {
      const txUuid = oThis.failMarkedTransactionUuids[index],
        pendingTransaction = oThis.pendingTransactionsMap[txUuid],
        txMeta = oThis.txUuidToTxMetaMap[txUuid],
        ic = oThis.tokenIdToInstanceComposerMap[txMeta.token_id];

      const balanceShardNumber = await oThis._setBalanceShardNumber(txMeta.token_id);

      const BalanceModel = ic.getShadowedClassFor(coreConstants.icNameSpace, 'BalanceModel'),
        balanceObj = new BalanceModel({ shardNumber: balanceShardNumber });

      const unsettledDebitsArray = pendingTransaction.unsettledDebits;

      for (let unsettledDebitsIndex = 0; unsettledDebitsIndex < unsettledDebitsArray.length; unsettledDebitsIndex++) {
        const unsettledDebits = unsettledDebitsArray[unsettledDebitsIndex];
        const blockChainUnsettleDebitsBn = new BigNumber(unsettledDebits.blockChainUnsettleDebits);

        unsettledDebits.blockChainUnsettleDebits = blockChainUnsettleDebitsBn.mul(-1).toString(10);

        const updateResponse = await balanceObj.updateBalance(unsettledDebits);
        logger.info('update response ------- ', updateResponse);
      }
    }
  }

  /**
   * Get balance shard for token id.
   *
   * @param {string/number} tokenId
   *
   * @returns {Promise<*|Promise<Promise<never>|*>>}
   * @private
   */
  async _setBalanceShardNumber(tokenId) {
    const oThis = this;

    if (!oThis.tokenToBalanceShardNumberMap[tokenId]) {
      const ic = oThis.tokenIdToInstanceComposerMap[tokenId],
        TokenShardNumbersCache = ic.getShadowedClassFor(coreConstants.icNameSpace, 'TokenShardNumbersCache');

      const response = await new TokenShardNumbersCache({ tokenId: tokenId }).fetch();

      const balanceShardNumber = response.data[entityConst.balanceEntityKind];

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
