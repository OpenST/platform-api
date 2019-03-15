'use strict';
/**
 * When the Ex Tx Executable gets a message from Rabbitmq, it needs to maintain the order even if
 * running with higher prefetch. To ensure this, we create local queue which maintains the order.
 */

const rootPrefix = '../..',
  NonceGetForTransaction = require(rootPrefix + '/lib/nonce/get/ForTransaction'),
  TransactionMetaModel = require(rootPrefix + '/app/models/mysql/TransactionMeta'),
  TokenAddressByIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddressById'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  transactionMetaConst = require(rootPrefix + '/lib/globalConstant/transactionMeta'),
  basicHelper = require(rootPrefix + '/helpers/basic');

const promiseQueueMap = {},
  tokenAddressIdToWorkerMap = {};

class BeforeExTxProcessorSequentialStepPerformer {
  /**
   * @constructor
   *
   * @param chainId
   * @param tokenAddressId
   */
  constructor(chainId, tokenAddressId) {
    const oThis = this;

    oThis.chainId = chainId;
    oThis.tokenAddressId = tokenAddressId;
  }

  /**
   * internal queue name
   *
   * @return {string}
   */
  get internalQueue() {
    const oThis = this;

    // Following internal queue is shared between multiple objects of BeforeExTxProcessorSequentialStepPerformer
    return oThis.chainId + '-' + oThis.tokenAddressId;
  }

  /**
   * Perform
   *
   * @param transactionMetaId
   * @return {Promise<any>}
   */
  perform(transactionMetaId) {
    const oThis = this;

    let promiseContext = {
      resolve: null,
      reject: null,
      payload: {}
    };

    // enqueue
    let p = new Promise(function(resolve, reject) {
      promiseContext.resolve = resolve;
      promiseContext.reject = reject;
    });
    promiseContext.payload.transactionMetaId = transactionMetaId;

    promiseQueueMap[oThis.internalQueue] = promiseQueueMap[oThis.internalQueue] || [];

    // Pushing the promise context to queue
    promiseQueueMap[oThis.internalQueue].push(promiseContext);

    oThis._startProcessingQueueIfNeeded();

    return p;
  }

  /**
   * Start processing queue if needed
   *
   * @return {Promise<void>}
   * @private
   */
  _startProcessingQueueIfNeeded() {
    const oThis = this;

    // if some already in process, return
    if (promiseQueueMap[oThis.internalQueue].length > 1) {
      return Promise.resolve();
    }

    // else start processing
    return oThis._processHead().catch(function(err) {
      oThis._catchHandler(err);
    });
  }

  /**
   * Process head
   *
   * @return {Promise<void>}
   * @private
   */
  async _processHead() {
    const oThis = this,
      promiseContext = promiseQueueMap[oThis.internalQueue][0];

    // if nothing to do, return
    if (!promiseContext) return;

    let transactionMetaId = promiseContext.payload.transactionMetaId;

    await oThis._lockTxMeta(transactionMetaId);

    let fromAddress = await oThis._fetchFromAddress();

    if (!fromAddress) {
      await new TransactionMetaModel().updateRecordsByReleasingLock({
        id: transactionMetaId,
        status: transactionMetaConst.rollBackBalanceStatus
      });

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_t_sm_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { err: 'from address not found for tokenAddressId: ' + oThis.tokenAddressId }
        })
      );
    } else {
      let resp = await new NonceGetForTransaction({
        address: fromAddress,
        chainId: oThis.chainId
      }).getNonce();

      if (resp.isFailure()) {
        await new TransactionMetaModel().updateRecordsByReleasingLock({
          id: transactionMetaId,
          status: transactionMetaConst.gethDownStatus
        });
        return Promise.reject(resp);
      } else {
        promiseContext.resolve(resp);
      }
    }

    // remove the zeroth element from the array
    promiseQueueMap[oThis.internalQueue].shift();

    // After removing the head element of the array, process head again.
    setImmediate(function() {
      oThis._processHead().catch(function(err) {
        oThis._catchHandler(err);
      });
    });
  }

  /**
   * catch handler
   *
   * @param error
   * @private
   */
  _catchHandler(error) {
    const oThis = this;
    let promiseContext = promiseQueueMap[oThis.internalQueue][0];
    logger.error('catch handler for tokenAddressId -', oThis.tokenAddressId);

    if (!responseHelper.isCustomResult(error)) {
      logger.error('app/services/token/Mint::perform::catch');
      logger.error(error);
      error = responseHelper.error({
        internal_error_identifier: 'l_t_sm_2',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: {}
      });
    }

    promiseContext.reject(error);
  }

  /**
   * Aquire lock on tx meta row
   *
   * @param transactionMetaId
   * @return {Promise<never>}
   * @private
   */
  async _lockTxMeta(transactionMetaId) {
    const lockId = basicHelper.timestampInSeconds() + '.' + transactionMetaId;

    let resp = await new TransactionMetaModel()
      .update(['lock_id = ?', lockId])
      .where(['id = ?', transactionMetaId])
      .where(['lock_id IS NULL'])
      .where(['status = ?', transactionMetaConst.invertedStatuses[transactionMetaConst.queuedStatus]])
      .fire();

    if (resp.affectedRows <= 0) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_t_sm_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            errMsg: 'Could not acquire lock.',
            transactionMetaId: transactionMetaId,
            queryResp: resp
          }
        })
      );
    }
  }

  /**
   * Fetch from address
   *
   * @return {Promise<*>}
   * @private
   */
  async _fetchFromAddress() {
    const oThis = this;

    // if from address is already fetched, nothing to do.
    let tokenAddress = tokenAddressIdToWorkerMap[oThis.internalQueue];
    if (!tokenAddress) {
      let tokenAddressResp = await new TokenAddressByIdCache({
        tokenAddressId: oThis.tokenAddressId
      }).fetch();
      tokenAddressIdToWorkerMap[oThis.internalQueue] = tokenAddress = tokenAddressResp.data.address;
    }

    return tokenAddress;
  }
}

module.exports = BeforeExTxProcessorSequentialStepPerformer;
