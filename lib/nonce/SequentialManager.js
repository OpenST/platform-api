'use strict';

const rootPrefix = '../..',
  NonceManager = require(rootPrefix + '/lib/nonce/Manager'),
  TokenAddressByTokenAddressIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddressByTokenAddressId');

const promiseQueueMap = {},
  tokenAddressIdToWorkerMap = {};

class SequentialNonceManager {
  constructor(chainId, tokenAddressId) {
    const oThis = this;

    oThis.chainId = chainId;
    oThis.tokenAddressId = tokenAddressId;
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
    return oThis._processHead();
  }

  async _processHead() {
    const oThis = this;

    console.log('_processHead main aaye ho kya??...00..........');
    // if nothing to do, return
    if (promiseQueueMap[oThis.internalQueue].length == 0) {
      return Promise.resolve();
    }

    let fromAddress = await oThis._fetchFromAddress();

    let resp = await new NonceManager({
      address: fromAddress,
      chainId: oThis.chainId
    }).getNonce();

    let promiseContext = promiseQueueMap[oThis.internalQueue][0];
    if (resp.isFailure()) {
      promiseContext.reject(resp);
    } else {
      promiseContext.resolve(resp);
    }

    // remove the zeroth element from the array
    promiseQueueMap[oThis.internalQueue].shift();

    setImmediate(function() {
      oThis._processHead();
    });
  }

  async _fetchFromAddress() {
    const oThis = this;

    // if from already fetched, nothing to do
    if (!tokenAddressIdToWorkerMap[oThis.internalQueue]) {
      let tokenAddress = await new TokenAddressByTokenAddressIdCache({ tokenAddressId: oThis.tokenAddressId }).fetch();
      tokenAddressIdToWorkerMap[oThis.internalQueue] = tokenAddress.data.address;
    }
    return tokenAddressIdToWorkerMap[oThis.internalQueue];
  }
}

module.exports = SequentialNonceManager;
