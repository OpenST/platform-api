'use strict';

const BigNumber = require('bignumber.js');

const rootPrefix = '../..',
  OpenStCache = require('@openstfoundation/openst-cache'),
  CustomWebProvider = require(rootPrefix + '/lib/nonce/CustomWebProvider'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  SharedMemcachedProvider = require(rootPrefix + '/lib/providers/sharedMemcached'),
  NonceHelper = require(rootPrefix + '/lib/nonce/Helper'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  errorConfig = basicHelper.fetchErrorConfig(apiVersions.general),
  waitTimeout = 50000, //50 seconds
  waitTimeInterval = 2000; //2 second

class NonceManagerKlass {
  /**
   * @constructor
   *
   * @param {Object} params
   *
   */
  constructor(params) {
    const oThis = this;

    oThis.address = params['address'].toLowerCase();
    oThis.chainKind = params['chainKind']; // origin & aux
    oThis.chainType = params['chainType']; // geth & parity
    oThis.clientId = params['clientId'];
    oThis.chainId = params['chainId'];
    oThis.chainWsProviders = params['chainWsProviders'];
    oThis.chainRpcProviders = params['chainRpcProviders'];
    oThis.configStrategy = params['configStrategy'];

    oThis.consistentBehavior = '0';
    oThis.lockingTtl = 5; // in seconds
    oThis.startTime = Date.now();
  }

  /**
   * Creates the cacheImplementer.
   *
   * @returns {Promise<never>}
   */
  async deepInit() {
    const oThis = this;

    //TODO: Change logic here to use client specific cache
    if (true) {
      // Create a shared memcached object for non-client specific memcached.
      let cacheObject = SharedMemcachedProvider.getInstance(oThis.consistentBehavior);
      oThis.cacheImplementer = cacheObject.cacheInstance;
    } else {
      // Create cache object for a client.
      //TODO: implement logic here
      let cacheConfigStrategy = {};

      let cacheObject = OpenStCache.getInstance(cacheConfigStrategy);
      oThis.cacheImplementer = cacheObject.cacheInstance;
    }

    // Set cache key for nonce
    oThis.cacheKey = `nonce_${oThis.chainKind}_${oThis.chainId}_${oThis.address}`;
    logger.debug('NM :: NonceManagerKlass :: oThis.cacheKey: ', oThis.cacheKey);

    // Set cache key for nonce lock
    oThis.cacheLockKey = `nonce_${oThis.chainKind}_${oThis.chainId}_${oThis.address}_lock`;
    logger.debug('NM :: NonceManagerKlass :: oThis.cacheLockKey: ', oThis.cacheLockKey);
  }

  /**
   * Get nonce. This gets the nonce from cache then increments and returns. If not in cache it gets from chain
   *
   * @return {promise<result>}
   */
  async getNonce(customOnResolve, customOnReject) {
    const oThis = this;

    let promiseObj;

    if (!customOnResolve || !customOnReject) {
      promiseObj = new Promise(function(onResolve, onReject) {
        customOnReject = onReject;
        customOnResolve = onResolve;
      });
    } else {
      promiseObj = new Promise(function(customOnResolve, customOnReject) {});
    }

    if (!oThis.cacheImplementer) {
      await oThis.deepInit();
    }

    let fetchIncrementedNonceRsp = await oThis._incrementNonce(),
      nonce = fetchIncrementedNonceRsp.data.response;

    if (fetchIncrementedNonceRsp.isSuccess() && nonce != null) {
      logger.debug(
        'NM :: getNonce :: nonceReceived: ',
        `chainKind_${oThis.chainKind}_chainId_${oThis.chainId}_addr_${oThis.address}_nonce_${nonce}`
      );
      customOnResolve(responseHelper.successWithData({ nonce: parseInt(nonce) }));
    } else {
      oThis._acquireLockAndSyncNonceFromChain(customOnResolve, customOnReject);
    }

    return promiseObj;
  }

  /**
   * 1. Acquire the lock
   * 2. Fetch nonce from Chain
   * 3. Set it in cache
   * 4. release lock
   *
   * @return {promise<result>}
   * @private
   * @ignore
   */
  async _acquireLockAndSyncNonceFromChain(onResolve, onReject) {
    const oThis = this;

    const acquireLockAndReturnNonce = async function() {
      const acquireLockResponse = await oThis._acquireLock();

      if (acquireLockResponse.isSuccess()) {
        let syncNonceResp = await oThis._getNonceFromChainAndSetCache();
        if (syncNonceResp.isSuccess()) {
          logger.debug(
            'NM :: getNonce :: syncNonceReturned: ',
            `chainKind_${oThis.chainKind}_chain_${oThis.chainId}_addr_${oThis.address}_nonce_${
              syncNonceResp.data.nonce
            }`
          );
        }
        await oThis._releaseLock();
        return syncNonceResp;
      } else {
        return acquireLockResponse;
      }
    };

    const wait = function() {
      try {
        //Check for timeout.
        if (oThis._getTimeStamp() - oThis.startTime > waitTimeout) {
          //Format the error
          logger.error('NM :: wait :: promise has timed out');
          let errorResult = responseHelper.error({
            internal_error_identifier: 'l_nm_getNonce_1',
            api_error_identifier: 'internal_server_error',
            debug_options: { timedOut: true },
            error_config: errorConfig
          });
          return onResolve(errorResult);
        }

        //Try to acquire lock directly.
        acquireLockAndReturnNonce()
          .catch(function(reason) {
            logger.error('NM :: acquireLockAndReturn rejected the Promise. reason :: ', reason);
            return responseHelper.error({
              internal_error_identifier: 'acquireLockAndReturnNonce_ex_catch_1',
              api_error_identifier: 'internal_server_error',
              error_config: errorConfig
            });
          })
          .then(function(response) {
            const acquireLockResponseData = response.toHash();
            if (response.isSuccess()) {
              //We got the lock.
              return onResolve(response);
            } else if (
              acquireLockResponseData.err &&
              acquireLockResponseData.err.internal_id &&
              String(acquireLockResponseData.err.internal_id).indexOf('acquireLockAndReturnNonce_ex_catch_1') >= 0
            ) {
              //Safety-Net. acquireLockAndReturn reject the Promise.
              return onResolve(response);
            } else {
              //Lets try again to aquire lock.
              logger.debug(
                'NM :: getNonce :: lockIsAcquiredBySomeBody : ',
                `chainKind_${oThis.chainKind}_chain_${oThis.chainId}_addr_${oThis.address}`
              );
              setTimeout(function() {
                oThis.getNonce(onResolve, onReject);
              }, waitTimeInterval);
            }
          });
      } catch (err) {
        //Format the error
        logger.error('NM :: IMPORTANT :: wait inside catch ', err);
        return onResolve(
          responseHelper.error({
            internal_error_identifier: 'l_nm_getNonce_2',
            api_error_identifier: 'internal_server_error',
            error_config: errorConfig
          })
        );
      }
    };

    try {
      return wait();
    } catch (err) {
      //Format the error
      logger.error('NM :: IMPORTANT :: processNext inside catch ', err);
      return onResolve(
        responseHelper.error({
          internal_error_identifier: 'l_nm_getNonce_3',
          api_error_identifier: 'internal_server_error',
          error_config: errorConfig
        })
      );
    }
  }

  async completionWithFailure(shouldSyncNonce) {
    const oThis = this;
    logger.error('NM :: completionWithFailure called with shouldSyncNonce: ', shouldSyncNonce);
    if (shouldSyncNonce) {
      await oThis._deleteNonceFromCache();
    }
    return responseHelper.successWithData({});
  }

  /**
   * Acquire the lock the nonce usage for the address
   *
   * @return {promise<result>}
   * @private
   * @ignore
   */
  async _acquireLock() {
    const oThis = this;

    const lockResponse = await oThis.cacheImplementer.acquireLock(oThis.cacheLockKey, oThis.lockingTtl);

    if (lockResponse.isFailure()) {
      return responseHelper.error({
        internal_error_identifier: 'l_nm_acquireLock_fail_2',
        api_error_identifier: 'acquire_lock_failed',
        debug_options: { msg: 'Error in acquiring lock.' },
        error_config: errorConfig
      });
    }

    return responseHelper.successWithData({});
  }

  /**
   * Release the lock for nonce usage for the address
   *
   * @return {promise<result>}
   * @private
   * @ignore
   */
  async _releaseLock() {
    const oThis = this;
    return oThis.cacheImplementer.releaseLock(oThis.cacheLockKey);
  }

  /**
   * increment nonce
   *
   * @return {promise<result>}
   * @private
   * @ignore
   */
  async _incrementNonce() {
    const oThis = this;
    return oThis.cacheImplementer.increment(oThis.cacheKey);
  }

  /**
   * decrement nonce
   *
   * @return {promise<result>}
   * @private
   * @ignore
   */
  async _deleteNonceFromCache() {
    const oThis = this;
    return oThis.cacheImplementer.del(oThis.cacheKey);
  }

  /**
   * 1. Fetch nonce from all the chain nodes
   * 2. set nonce in cache
   *
   * @return {promise<result>}
   * @private
   * @ignore
   */
  async _getNonceFromChainAndSetCache() {
    const oThis = this,
      getMinedTxCountPromises = [],
      getPendingTxnsPromises = [];

    for (let i = oThis.chainWsProviders.length - 1; i >= 0; i--) {
      const wsChainURL = oThis.chainWsProviders[i],
        rpcChainURL = oThis.chainRpcProviders[i];

      const web3Provider = CustomWebProvider.getInstance(wsChainURL, oThis.chainType);
      getMinedTxCountPromises.push(NonceHelper.getMinedTxCountFromNode(oThis.address, web3Provider));
      getPendingTxnsPromises.push(NonceHelper.getUnminedTransactionsFromNode(web3Provider, rpcChainURL));
    }

    let cumulativePromiseResponses = await Promise.all([
      Promise.all(getMinedTxCountPromises),
      Promise.all(getPendingTxnsPromises)
    ]);
    const getMinedTxCountResults = cumulativePromiseResponses[0];
    const pendingTxnsResults = cumulativePromiseResponses[1];

    let maxNonceCount = new BigNumber(0),
      isNonceCountAvailable = false,
      unminedTxNonces = [];

    // check nonce count from pending transactions
    for (let i = pendingTxnsResults.length - 1; i >= 0; i--) {
      const currentPendingTransactionResponse = pendingTxnsResults[i];
      if (currentPendingTransactionResponse.isFailure()) {
        continue;
      }

      const unminedTransactions = currentPendingTransactionResponse.data.unmined_transactions;

      if (unminedTransactions) {
        unminedTxNonces = unminedTxNonces.concat(oThis.getNoncesOfUnminedTxs(unminedTransactions.pending));
        unminedTxNonces = unminedTxNonces.concat(oThis.getNoncesOfUnminedTxs(unminedTransactions.queued));
      }
    }

    // check nonce count from mined transactions
    for (let i = getMinedTxCountResults.length - 1; i >= 0; i--) {
      const currentNonceResponse = getMinedTxCountResults[i];
      if (currentNonceResponse.isFailure()) {
        continue;
      }

      isNonceCountAvailable = true;
      const currentNonce = new BigNumber(currentNonceResponse.data.mined_transaction_count);
      maxNonceCount = BigNumber.max(currentNonce, maxNonceCount);
    }

    if (isNonceCountAvailable || unminedTxNonces.length > 0) {
      if (unminedTxNonces.length > 0) {
        for (let i = unminedTxNonces.length - 1; i >= 0; i--) {
          const unminedNonceCount = new BigNumber(unminedTxNonces[i]);
          maxNonceCount = BigNumber.max(unminedNonceCount.plus(1), maxNonceCount);
        }
      }

      const setNonceResponse = await oThis.cacheImplementer.set(oThis.cacheKey, maxNonceCount.toNumber());
      logger.log('NM :: maxNonceCount: ', maxNonceCount.toNumber());

      if (setNonceResponse.isSuccess()) {
        return Promise.resolve(responseHelper.successWithData({ nonce: maxNonceCount.toNumber() }));
      }

      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'l_nm_syncNonce_fail_1',
          api_error_identifier: 'internal_server_error',
          debug_options: { msg: 'unable to set nonce in cache.' },
          error_config: errorConfig
        })
      );
    } else {
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'l_nm_syncNonce_fail_2',
          api_error_identifier: 'internal_server_error',
          debug_options: { msg: 'unable to fetch nonce from chain nodes.' },
          error_config: errorConfig
        })
      );
    }
  }

  /**
   * get the nounce count from all pending transations
   *
   * @param pendingTransactions {object} : data of unminedTransactions
   * @return {promise<result>}
   * @private
   * @ignore
   */
  getNoncesOfUnminedTxs(pendingTransactions) {
    const oThis = this;
    let allNonce = [];
    for (let key in pendingTransactions) {
      if (key.toLowerCase() === oThis.address) {
        allNonce = allNonce.concat(oThis.getNonceFromUnminedTransaction(pendingTransactions[key]));
      }
    }
    return allNonce;
  }

  /**
   * Get the nonce count from the transaction objects from a given address
   *
   * @param unminedTransactions {object} : data of unminedTransactions from an address
   * @return {promise<result>}
   * @private
   * @ignore
   */
  getNonceFromUnminedTransaction(unminedTransactions) {
    const allNonce = [];
    if (unminedTransactions) {
      for (let nonceKey in unminedTransactions) {
        allNonce.push(new BigNumber(nonceKey)); //As nonce key itself is a nonce
      }
    }
    return allNonce;
  }

  /**
   * Utility function to get timestamp
   *
   * @return {number}
   * @private
   * @ignore
   */
  _getTimeStamp() {
    return !Date.now ? +new Date() : Date.now();
  }
}

module.exports = NonceManagerKlass;
