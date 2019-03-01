'use strict';

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  errorConstant = require(rootPrefix + '/lib/globalConstant/error'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId');

const errorConfig = basicHelper.fetchErrorConfig(apiVersions.general),
  waitTimeout = 50000, //50 seconds
  waitTimeInterval = 2000; //2 second

require(rootPrefix + '/lib/providers/nonceMemcached');

class GetNonceBase {
  /**
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.address = params.address.toLowerCase();
    oThis.chainId = params.chainId;
    oThis.configStrategy = params.configStrategy || null; // optional

    oThis.startTime = Date.now();
    oThis.chainWsProviders = null;
    oThis.chainRpcProviders = null;
    oThis.chainKind = null; // origin & aux
    oThis.chainClient = null; // geth & parity
    oThis.promiseContext = null;
  }

  /**
   * Get Nonce
   * @return {Promise<void>}
   */
  async getNonce() {
    const oThis = this;

    let promiseObj = oThis._createPromiseContext();

    await oThis._setCacheImplementer();

    oThis._tryFetchingNonce();

    return promiseObj;
  }

  /**
   * consistent behavior
   *
   * @return {string}
   */
  get consistentBehavior() {
    return '0';
  }

  /**
   * locking ttl
   *
   * @return {number}
   */
  get lockingTtl() {
    return 5; // in seconds
  }

  /**
   * create promise context
   *
   * @return {Promise<any>}
   * @private
   */
  _createPromiseContext() {
    const oThis = this;

    oThis.promiseContext = {
      resolve: null,
      reject: null
    };

    // enqueue
    return new Promise(function(resolve, reject) {
      oThis.promiseContext.resolve = resolve;
      oThis.promiseContext.reject = reject;
    });
  }

  /**
   * set cache implementer
   *
   * @return {Promise<never>}
   * @private
   */
  async _setCacheImplementer() {
    const oThis = this;

    if (!oThis.configStrategy) {
      const strategyByChainHelperObj = new StrategyByChainHelper(oThis.chainId),
        configStrategyResp = await strategyByChainHelperObj.getComplete();

      if (configStrategyResp.isFailure()) {
        return Promise.reject(configStrategyResp);
      }

      oThis.configStrategy = configStrategyResp.data;
    }

    const configStrategyObj = new ConfigStrategyObject(oThis.configStrategy);

    oThis.chainWsProviders = configStrategyObj.chainWsProviders(oThis.chainId, 'readWrite');
    oThis.chainRpcProviders = configStrategyObj.chainRpcProviders(oThis.chainId, 'readWrite');
    oThis.chainKind = configStrategyObj.chainKind(oThis.chainId); // origin / aux
    oThis.chainClient = configStrategyObj.chainClient(oThis.chainId); // geth / parity

    let ic = new InstanceComposer(oThis.configStrategy);

    let cacheObject = ic
      .getInstanceFor(coreConstants.icNameSpace, 'nonceCacheProvider')
      .getInstance(oThis.consistentBehavior);

    oThis.cacheImplementer = cacheObject.cacheInstance;
  }

  /**
   * try fetching nonce
   *
   * @return {Promise<*>}
   * @private
   */
  async _tryFetchingNonce() {
    const oThis = this;

    // use cache key to fetch nonce from cache
    let fetchIncrementedNonceRsp = await oThis._incrementNonce(),
      nonce = fetchIncrementedNonceRsp.data.response;

    if (fetchIncrementedNonceRsp.isSuccess() && nonce != null) {
      logger.debug(
        'NM :: get nonce from cache: ',
        `chainKind_${oThis.chainKind}_chainId_${oThis.chainId}_addr_${oThis.address}_nonce_${nonce}`
      );

      return oThis.promiseContext.resolve(
        responseHelper.successWithData({ nonce: parseInt(nonce), address: oThis.address })
      );
    } else {
      // if not found in cache, sync nonce from chain
      return oThis._acquireLockAndSyncNonceFromChain();
    }
  }

  /**
   * increment nonce
   *
   * @return {Promise<Promise<result>|*|{values, boundary}>}
   * @private
   */
  async _incrementNonce() {
    const oThis = this;
    return oThis.cacheImplementer.increment(oThis.cacheKey);
  }

  /**
   * acquire lock and sync nonce from chain
   *
   * Steps:
   * 1. Acquire the lock
   * 2. Fetch nonce from Chain
   * 3. Set it in cache
   * 4. release lock
   *
   * @return {Promise<*>}
   * @private
   */
  async _acquireLockAndSyncNonceFromChain() {
    const oThis = this;

    const acquireLockAndReturnNonce = async function() {
      const acquireLockResponse = await oThis._acquireLock();

      if (acquireLockResponse.isSuccess()) {
        let syncNonceResp = await oThis._getNonceFromChainAndSetCache();
        if (syncNonceResp.isSuccess()) {
          logger.debug(
            'NM :: sync nonce from chain: ',
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
          let errorCode = 'l_n_g_b_1:' + errorConstant.gethDown;

          //Format the error
          logger.error('NM :: wait :: promise has timed out');
          let errorResult = responseHelper.error({
            internal_error_identifier: errorCode,
            api_error_identifier: 'internal_server_error',
            debug_options: {
              timeStamp: oThis._getTimeStamp(),
              timedOut: true
            },
            error_config: errorConfig
          });
          return oThis.promiseContext.resolve(errorResult);
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
              return oThis.promiseContext.resolve(response);
            } else if (
              acquireLockResponseData.err &&
              acquireLockResponseData.err.internal_id &&
              String(acquireLockResponseData.err.internal_id).indexOf('acquireLockAndReturnNonce_ex_catch_1') >= 0
            ) {
              //Safety-Net. acquireLockAndReturn reject the Promise.
              return oThis.promiseContext.resolve(response);
            } else {
              //Lets try again to aquire lock.
              logger.debug(
                'NM :: getNonce :: lockIsAcquiredBySomeBody : ',
                `chainKind_${oThis.chainKind}_chain_${oThis.chainId}_addr_${oThis.address}`
              );
              setTimeout(function() {
                oThis._tryFetchingNonce();
              }, waitTimeInterval);
            }
          });
      } catch (err) {
        //Format the error
        logger.error('NM :: IMPORTANT :: wait inside catch ', err);
        return oThis.promiseContext.resolve(
          responseHelper.error({
            internal_error_identifier: 'l_n_g_b_2',
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
      return oThis.promiseContext.resolve(
        responseHelper.error({
          internal_error_identifier: 'l_n_g_b_3',
          api_error_identifier: 'internal_server_error',
          error_config: errorConfig
        })
      );
    }
  }

  /**
   * acquire lock
   *
   * @return {Promise<*>}
   * @private
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
   * release lock
   *
   * @return {Promise<*>}
   * @private
   */
  async _releaseLock() {
    const oThis = this;
    return oThis.cacheImplementer.releaseLock(oThis.cacheLockKey);
  }

  /**
   * get time stamp
   * @return {number}
   * @private
   */
  _getTimeStamp() {
    return !Date.now ? +new Date() : Date.now();
  }

  /**
   * Methods to be implemented by sub class
   */

  /**
   * cache key
   */
  get cacheKey() {
    throw 'sub-class to implement.';
  }

  /**
   * cache lock key
   */
  get cacheLockKey() {
    throw 'sub-class to implement.';
  }

  /**
   * get nonce from chain and set cache
   */
  _getNonceFromChainAndSetCache() {
    throw 'sub-class to implement.';
  }
}

module.exports = GetNonceBase;
