'use strict';

const rootPrefix = '../..',
  NonceManager = require(rootPrefix + '/lib/nonce/Manager'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  TransactionMetaModel = require(rootPrefix + '/app/models/mysql/TransactionMeta'),
  TokenAddressByTokenAddressIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddressByTokenAddressId');

const promiseQueueMap = {},
  tokenAddressIdToWorkerMap = {};

class SequentialNonceManager {
  constructor(chainId, tokenAddressId, options) {
    const oThis = this;

    oThis.chainId = chainId;
    oThis.tokenAddressId = tokenAddressId;
    oThis.transactionMetaId = options.transactionMetaId;
  }

  get internalQueue() {
    const oThis = this;

    return oThis.chainId + '-' + oThis.tokenAddressId;
  }

  queueAndFetchNonce() {
    const oThis = this;

    let promiseContext = {
      resolve: null,
      reject: null
    };

    // enqueue
    let p = new Promise(function(resolve, reject) {
      promiseContext.resolve = resolve;
      promiseContext.reject = reject;
    });
    promiseQueueMap[oThis.internalQueue] = promiseQueueMap[oThis.internalQueue] || [];

    promiseQueueMap[oThis.internalQueue].push(promiseContext);

    oThis._tryProcessingQueue();

    return p;
  }

  _tryProcessingQueue() {
    const oThis = this;

    // if some already in process, return
    if (promiseQueueMap[oThis.internalQueue].length > 1) {
      return Promise.resolve();
    }

    // else start processing
    return oThis._processHead().catch(function(err) {
      oThis.catchHandler(err);
    });
  }

  async _processHead() {
    const oThis = this;

    logger.log('_processHead main aaye ho kya??...00..........');
    // if nothing to do, return
    if (promiseQueueMap[oThis.internalQueue].length == 0) {
      return Promise.resolve();
    }

    let metaLockId = await oThis._lockTxMeta();
    let fromAddress = await oThis._fetchFromAddress();
    let promiseContext = promiseQueueMap[oThis.internalQueue][0];

    if (!fromAddress) {
      promiseContext.resolve(
        responseHelper.error({
          internal_error_identifier: 'l_n_sm_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { err: 'from address not found for tokenAddressId->' + oThis.tokenAddressId }
        })
      );
    } else {
      let resp = await new NonceManager({
        address: fromAddress,
        chainId: oThis.chainId
      }).getNonce();

      promiseContext.resolve(resp);
    }

    // remove the zeroth element from the array
    promiseQueueMap[oThis.internalQueue].shift();

    setImmediate(function() {
      oThis._processHead().catch(function(err) {
        oThis.catchHandler(err);
      });
    });
  }

  catchHandler(err) {
    const oThis = this;
    let promiseContext = promiseQueueMap[oThis.internalQueue][0];
    logger.error('catch handler for tokenAddressId -', oThis.tokenAddressId);
    promiseContext.resolve(
      responseHelper.error({
        internal_error_identifier: 'l_n_sm_2',
        api_error_identifier: 'something_went_wrong',
        debug_options: {
          errMsg: 'catch handler for tokenAddressId->' + oThis.tokenAddressId,
          tokenAddressId: oThis.tokenAddressId,
          err: err
        }
      })
    );
  }

  async _lockTxMeta() {
    const oThis = this,
      lockId = Date.now() + '.' + oThis.transactionMetaId;

    return new TransactionMetaModel()
      .update(['lock_id = ?', lockId])
      .where(['id = ?', oThis.transactionMetaId])
      .fire();
  }

  async _fetchFromAddress() {
    const oThis = this;

    // if from address is already fetched, nothing to do.
    if (!tokenAddressIdToWorkerMap[oThis.internalQueue]) {
      let tokenAddress = await new TokenAddressByTokenAddressIdCache({ tokenAddressId: oThis.tokenAddressId }).fetch();
      tokenAddressIdToWorkerMap[oThis.internalQueue] = tokenAddress.data.address;
    }
    return tokenAddressIdToWorkerMap[oThis.internalQueue];
  }
}

module.exports = SequentialNonceManager;
