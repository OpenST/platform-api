'use strict';

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
   * @param options
   */
  constructor(chainId, tokenAddressId, options) {
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
    promiseQueueMap[oThis.internalQueue] = promiseQueueMap[oThis.internalQueue] || [];

    promiseContext.payload.transactionMetaId = transactionMetaId;

    promiseQueueMap[oThis.internalQueue].push(promiseContext);

    oThis._tryProcessingQueue();

    return p;
  }

  /**
   * Try processing queue
   *
   * @return {Promise<void>}
   * @private
   */
  _tryProcessingQueue() {
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
    const oThis = this;

    logger.log('_processHead main aaye ho kya??...00..........');

    let promiseContext = promiseQueueMap[oThis.internalQueue][0];

    // if nothing to do, return
    if (!promiseContext) {
      return Promise.resolve();
    }

    let transactionMetaId = promiseContext.payload.transactionMetaId;

    await oThis._lockTxMeta(transactionMetaId);

    let fromAddress = await oThis._fetchFromAddress();
    if (!fromAddress) {
      await new TransactionMetaModel().releaseLockAndMarkStatus({
        id: transactionMetaId,
        status: transactionMetaConst.rollBackBalanceStatus
      });

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_n_sm_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { err: 'from address not found for tokenAddressId->' + oThis.tokenAddressId }
        })
      );
    } else {
      let resp = await new NonceGetForTransaction({
        address: fromAddress,
        chainId: oThis.chainId
      }).getNonce();

      if (resp.isFailure()) {
        await new TransactionMetaModel().releaseLockAndMarkStatus({
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
        internal_error_identifier: 'a_s_t_m_1',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: {}
      });
    }

    promiseContext.reject(error);
  }

  /**
   * Aquire lock on tx meta row
   *
   * @return {Promise<*>}
   * @private
   */
  /**
   * Aquire lock on tx meta row
   *
   * @param transactionMetaId
   * @return {Promise<*>}
   * @private
   */
  async _lockTxMeta(transactionMetaId) {
    const oThis = this,
      lockId = basicHelper.timestampInSeconds() + '.' + transactionMetaId;

    let resp = await new TransactionMetaModel()
      .update(['lock_id = ?', lockId])
      .where(['id = ?', transactionMetaId])
      .where(['lock_id IS NULL'])
      .where(['status = ?', transactionMetaConst.invertedStatuses[transactionMetaConst.queuedStatus]])
      .fire();

    console.log('Query resp-----------------------', resp);

    if (resp.affectedRows <= 0) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_n_sm_4',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            errMsg: 'Could not acquire lock.',
            transactionMetaId: transactionMetaId,
            queryResp: resp
          }
        })
      );
    }

    return responseHelper.successWithData({});
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
