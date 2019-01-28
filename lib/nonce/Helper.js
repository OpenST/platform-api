'use strict';

const BigNumber = require('bignumber.js');

const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CustomWebProvider = require(rootPrefix + '/lib/nonce/CustomWebProvider'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  errorConfig = basicHelper.fetchErrorConfig(apiVersions.general);

class NonceHelperKlass {
  /**
   * @constructor
   *
   *
   */
  constructor() {}

  /**
   * Get mined transaction count for given address
   *
   * @param {string} chainClient - chain kind e.g value, utility
   * @param {string} address - address whose nonce to be cleared
   * @param {Array} gethProviders - list of geth providers.
   *
   * @return {promise<result>}
   */
  static getMinedTransactionCount(chainClient, address, gethProviders) {
    try {
      const allNoncePromise = [],
        allGethNodes = gethProviders;
      for (let i = allGethNodes.length - 1; i >= 0; i--) {
        const gethURL = allGethNodes[i];

        const web3Provider = CustomWebProvider.getInstance(gethURL, chainClient);
        allNoncePromise.push(NonceHelperKlass.getMinedTxCountFromNode(address, web3Provider));
      }

      const allNoncePromiseResult = Promise.all(allNoncePromise);

      let isNonceAvailable = false;
      let nonceCount = 0;
      for (let i = allNoncePromiseResult.length - 1; i >= 0; i--) {
        const currentNonceResponse = allNoncePromiseResult[i];
        if (currentNonceResponse.isFailure()) {
          continue;
        }
        const currentNonce = new BigNumber(currentNonceResponse.data.mined_transaction_count);
        nonceCount = BigNumber.max(currentNonce, nonceCount);
        isNonceAvailable = true;
      }
      if (!isNonceAvailable) {
        return Promise.resolve(
          responseHelper.error({
            internal_error_identifier: 'mo_w_nh_getTransactionCount_1',
            api_error_identifier: 'unable_to_get_transaction_count',
            error_config: errorConfig
          })
        );
      }

      return Promise.resolve(responseHelper.successWithData({ nonce: nonceCount }));
    } catch (err) {
      //Format the error
      logger.error('module_overrides/web3_eth/nonce_helper.js:getTransactionCount inside catch ', err);
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'mo_w_nh_getTransactionCount_2',
          api_error_identifier: 'unable_to_get_transaction_count',
          error_config: errorConfig
        })
      );
    }
  }

  /**
   * Get all queued transactions
   *
   * @param {string} chainClient - chain kind e.g value, utility
   * @param {Array} gethProviders - list of geth providers.
   *
   * @return {promise<result>}
   */
  static async getAllQueuedTransaction(chainClient, gethProviders) {
    try {
      const allTxPoolPromise = [],
        allGethNodes = gethProviders;

      for (let i = allGethNodes.length - 1; i >= 0; i--) {
        const gethURL = allGethNodes[i];
        const web3Provider = CustomWebProvider.getInstance(gethURL, chainClient);
        allTxPoolPromise.push(NonceHelperKlass.getUnminedTransactionsFromNode(web3Provider));
      }

      const allTxPoolPromiseResult = await Promise.all(allTxPoolPromise);
      const queuedData = {};

      logger.debug('allTxPoolPromiseResult: ', allTxPoolPromiseResult);
      let isTransactionAvailable = false;

      for (let i = allTxPoolPromiseResult.length - 1; i >= 0; i--) {
        const currentTxPoolResponse = allTxPoolPromiseResult[i];
        if (currentTxPoolResponse.isFailure()) {
          continue;
        }

        const pendingTransaction = currentTxPoolResponse.data.unmined_transactions.pending;
        const queuedTransaction = currentTxPoolResponse.data.unmined_transactions.queued;

        for (let address in pendingTransaction) {
          queuedData[address] = queuedData[address] || {};
          Object.assign(queuedData[address], pendingTransaction[address]);
        }

        for (let address in queuedTransaction) {
          queuedData[address] = queuedData[address] || {};
          Object.assign(queuedData[address], queuedTransaction[address]);
        }
        isTransactionAvailable = true;
      }

      if (!isTransactionAvailable) {
        return Promise.resolve(
          responseHelper.error({
            internal_error_identifier: 'mo_w_nh_getAllQueuedTransaction_1',
            api_error_identifier: 'unable_to_get_queued_transaction',
            error_config: errorConfig
          })
        );
      }
      return Promise.resolve(responseHelper.successWithData({ queuedData: queuedData }));
    } catch (err) {
      //Format the error
      logger.error('module_overrides/web3_eth/nonce_helper.js:getAllQueuedTransaction inside catch ', err);
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'mo_w_nh_getAllQueuedTransaction_2',
          api_error_identifier: 'unable_to_get_queued_transaction',
          error_config: errorConfig
        })
      );
    }
  }

  /**
   * Clear all missing nonce
   *
   * @param {string} chainClient - chain kind e.g value, utility
   * @param {object} scope - caller scope
   * @param {function} clearCallback - call back function that needs to be called when missing nonce is found
   * @param {Array} gethProviders - list of geth providers.
   *
   * @return {promise<result>}
   */
  static async clearAllMissingNonce(chainClient, scope, clearCallback, gethProviders) {
    try {
      const allQueuedTransaction = await NonceHelperKlass.getAllQueuedTransaction(chainClient, gethProviders);
      if (allQueuedTransaction.isFailure()) {
        return Promise.resolve(
          responseHelper.error({
            internal_error_identifier: 'mo_w_nh_clearAllMissingNonce_1',
            api_error_identifier: 'unable_to_get_queued_transaction',
            error_config: errorConfig
          })
        );
      }
      let successAddresses = [],
        failAddresses = [];

      const queuedData = allQueuedTransaction.data.queuedData;
      for (let address in queuedData) {
        const clearResponce = await NonceHelperKlass.clearMissingNonce(
          address,
          chainClient,
          queuedData[address],
          scope,
          clearCallback,
          gethProviders
        );
        if (clearResponce.isSuccess()) {
          successAddresses.push(address);
        } else {
          failAddresses.push(address);
        }
      }

      return Promise.resolve(
        responseHelper.successWithData({ successAddresses: successAddresses, failAddresses: failAddresses })
      );
    } catch (err) {
      //Format the error
      logger.error('module_overrides/web3_eth/nonce_helper.js:clearAllMissingNonce inside catch ', err);
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'mo_w_nh_clearAllMissingNonce_2',
          api_error_identifier: 'could_not_clear_missing_nonce',
          error_config: errorConfig
        })
      );
    }
  }

  /**
   * Clear all missing nonce for a given address
   *
   * @param {string} address - address whose nonce to be cleared
   * @param {string} chainClient - chain kind e.g value, utility
   * @param {Array} pendingTransactions - array of pending transaction
   * @param {object} scope - caller scope
   * @param {function} clearCallback - call back function that needs to be called when missing nonce is found
   * @param {Array} gethProviders - list of geth providers.
   *
   * @return {promise<result>}
   */
  static async clearMissingNonce(address, chainClient, pendingTransactions, scope, clearCallback, gethProviders) {
    if (!clearCallback) {
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'mo_w_nh_clearMissingNonce_1',
          api_error_identifier: 'callback_function_is_mandatory',
          error_config: errorConfig
        })
      );
    }

    try {
      const allNoncePromise = [],
        allGethNodes = gethProviders;

      for (let i = allGethNodes.length - 1; i >= 0; i--) {
        const gethURL = allGethNodes[i];

        const web3Provider = CustomWebProvider.getInstance(gethURL, chainClient);
        allNoncePromise.push(NonceHelperKlass.getMinedTxCountFromNode(address, web3Provider));
      }

      const allNoncePromiseResult = await Promise.all(allNoncePromise);

      let nonceCount = 0;
      for (let i = allNoncePromiseResult.length - 1; i >= 0; i--) {
        const currentNonceResponse = allNoncePromiseResult[i];
        if (currentNonceResponse.isFailure()) {
          continue;
        }
        const currentNonce = new BigNumber(currentNonceResponse.data.mined_transaction_count);
        nonceCount = BigNumber.max(currentNonce, nonceCount);
      }

      const maxNonceCount = Math.max(...Object.keys(pendingTransactions));

      for (let nonce = nonceCount; nonce <= maxNonceCount; nonce++) {
        // fix  nonce code here
        const bgNonce = new BigNumber(nonce);
        const nonceString = `${bgNonce.toString(10)}`;
        if (!pendingTransactions[nonceString]) {
          clearCallback.apply(scope, [address, nonceString]);

          //clearCallback(address, nonceString);
        }
      }

      return Promise.resolve(responseHelper.successWithData({ address: address }));
    } catch (err) {
      //Format the error
      logger.error('module_overrides/web3_eth/nonce_helper.js:clearMissingNonce inside catch ', err);
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'mo_w_nh_clearMissingNonce_2',
          api_error_identifier: 'could_not_clear_missing_nonce',
          error_config: errorConfig
        })
      );
    }
  }

  /**
   * Get transactionCount
   * @param {string} address - address for which transaction count is to be fetched.
   * @param {object} web3Provider - web3 object
   *
   * @return {promise<result>}
   */
  static async getMinedTxCountFromNode(address, web3Provider) {
    return new Promise(function(onResolve, onReject) {
      try {
        web3Provider.eth.getTransactionCount(address, function(error, result) {
          if (error) {
            return onResolve(
              responseHelper.error({
                internal_error_identifier: 'mo_w_nh_getMinedTxCountFromNode_1',
                api_error_identifier: 'something_went_wrong',
                debug_options: { error: error },
                error_config: errorConfig
              })
            );
          } else {
            return onResolve(responseHelper.successWithData({ mined_transaction_count: result }));
          }
        });
      } catch (err) {
        //Format the error
        logger.error('module_overrides/web3_eth/nonce_helper.js:getMinedTxCountFromNode inside catch ', err);
        return onResolve(
          responseHelper.error({
            internal_error_identifier: 'mo_w_nh_getMinedTxCountFromGeth_2',
            api_error_identifier: 'something_went_wrong',
            error_config: errorConfig
          })
        );
      }
    });
  }

  /**
   * Get pending transactions
   *
   * @param {object} wsWeb3Provider - web3 object
   * @param {string} rpcGethURL - rpc url (optional)
   * @return {promise<result>}
   */
  static async getUnminedTransactionsFromNode(wsWeb3Provider, rpcGethURL) {
    return new Promise(async function(onResolve, onReject) {
      try {
        const unminedTransactions = await wsWeb3Provider.unminedTransactionsWithLessData();

        //logger.debug('unminedTransactions: ', unminedTransactions);
        if (unminedTransactions) {
          return onResolve(responseHelper.successWithData({ unmined_transactions: unminedTransactions }));
        }
        return onResolve(
          responseHelper.error({
            internal_error_identifier: 'mo_w_nh_getUnminedTransactionsFromNode_1',
            api_error_identifier: 'something_went_wrong',
            error_config: errorConfig
          })
        );
      } catch (err) {
        //Format the error
        if (rpcGethURL) {
          const rpcWeb3Provider = CustomWebProvider.getInstance(rpcGethURL, wsWeb3Provider.chainClient),
            unminedTransactions = await rpcWeb3Provider.unminedTransactionsWithLessData();

          if (unminedTransactions) {
            return onResolve(responseHelper.successWithData({ unmined_transactions: unminedTransactions }));
          } else {
            return onResolve(
              responseHelper.error({
                internal_error_identifier: 'mo_w_nh_getUnminedTransactionsFromNode_2',
                api_error_identifier: 'something_went_wrong',
                error_config: errorConfig
              })
            );
          }
        }
        logger.error('module_overrides/web3_eth/nonce_helper.js:getUnminedTransactionsFromNode inside catch ', err);
        return onResolve(
          responseHelper.error({
            internal_error_identifier: 'mo_w_nh_getUnminedTransactionsFromNode_3',
            api_error_identifier: 'something_went_wrong',
            error_config: errorConfig
          })
        );
      }
    });
  }
}

module.exports = NonceHelperKlass;
