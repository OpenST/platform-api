'use strict';

const BigNumber = require('bignumber.js');

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  NonceHelper = require(rootPrefix + '/lib/nonce/Helper'),
  GetNonceBase = require(rootPrefix + '/lib/nonce/get/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  CustomWebProvider = require(rootPrefix + '/lib/nonce/CustomWebProvider');

const errorConfig = basicHelper.fetchErrorConfig(apiVersions.general);

class NonceGetForTransaction extends GetNonceBase {
  /**
   * Constructor for balance shard number cache
   *
   * @param {Object} params - cache key generation & expiry related params
   * @param {Number} params.chainId - chain id
   * @param {String} params.address - address
   *
   * @constructor
   */
  constructor(params) {
    super(params);
  }
  /**
   * cache key
   *
   * @return {string}
   */
  get cacheKey() {
    const oThis = this;

    let _cacheKey = `nonce_${oThis.chainKind}_${oThis.chainId}_${oThis.address}`;

    logger.debug('NM :: GetNonceForTransaction :: cacheKey: ', _cacheKey);
    return _cacheKey;
  }

  /**
   * cache lock key
   *
   * @return {string}
   */
  get cacheLockKey() {
    const oThis = this;

    let _cacheLockKey = `nonce_${oThis.chainKind}_${oThis.chainId}_${oThis.address}_lock`;

    logger.debug('NM :: GetNonceForTransaction :: cacheLockKey: ', _cacheLockKey);
    return _cacheLockKey;
  }

  /**
   * get nonce from chain and set cache
   *
   * @return {Promise<*>}
   * @private
   */
  async _getNonceFromChainAndSetCache() {
    // TODO - break this into smaller methods
    const oThis = this,
      getMinedTxCountPromises = [],
      getPendingTxnsPromises = [];

    for (let i = oThis.chainWsProviders.length - 1; i >= 0; i--) {
      const wsChainURL = oThis.chainWsProviders[i],
        rpcChainURL = oThis.chainRpcProviders[i];

      const web3Provider = CustomWebProvider.getInstance(wsChainURL, oThis.chainClient);
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
        return responseHelper.successWithData({ nonce: maxNonceCount.toNumber(), address: oThis.address });
      }

      return responseHelper.error({
        internal_error_identifier: 'l_nm_syncNonce_fail_1',
        api_error_identifier: 'internal_server_error',
        debug_options: { msg: 'unable to set nonce in cache.' },
        error_config: errorConfig
      });
    } else {
      return responseHelper.error({
        internal_error_identifier: 'l_nm_syncNonce_fail_2',
        api_error_identifier: 'internal_server_error',
        debug_options: { msg: 'unable to fetch nonce from chain nodes.' },
        error_config: errorConfig
      });
    }
  }

  /**
   * get nonces of unmined transactions
   * @param pendingTransactions
   * @return {Array}
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
   * get nonce from unmined transactions
   *
   * @param unminedTransactions
   * @return {Array}
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
}

module.exports = NonceGetForTransaction;
