'use strict';

/**
 * Module to sign and submit transaction on chain.
 *
 * @module lib/transactions/submitTransactionOnChain
 */
const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  PendingTransactionCrud = require(rootPrefix + '/lib/transactions/PendingTransactionCrud'),
  NonceGetForTransaction = require(rootPrefix + '/lib/nonce/get/ForTransaction'),
  Buffer = require('safe-buffer').Buffer,
  Tx = require('ethereumjs-tx'),
  BigNumber = require('bignumber.js'),
  AddressPrivateKeyCache = require(rootPrefix + '/lib/cacheManagement/shared/AddressPrivateKey'),
  errorConstant = require(rootPrefix + '/lib/globalConstant/error'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  Web3Util = require('web3-utils'),
  maxRetryCount = 1;

class SignSubmitTrxOnChain {
  /**
   *
   * @param params {object} - params object
   * @param params.chainId {number} - Chain Id
   * @param [params.web3Instance] {Object} - Web 3 Instance
   * @param [params.provider] {String} - Web 3 provider to create web 3 instance
   * @param params.txOptions {Object} - Transaction object
   * @param params.options {Object} - Extra Options
   * @param [params.waitTillReceipt] {number} - 0 or 1 to indicate whether to wait for transaction receipt or not.
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.chainId = params.chainId;
    oThis.web3Instance = params.web3Instance;
    oThis.web3ProviderPath = params.provider;
    oThis.txOptions = params.txOptions;
    oThis.afterReceipt = params.options;
    oThis.pendingTransaction = params.txOptions;
    oThis.waitTillReceipt = params.waitTillReceipt || 0;
    oThis.signerWeb3Object = null;
    oThis.batchRequest = null;
    oThis.signedTransaction = null;
    oThis.promiseContext = { resolve: null, reject: null };
    oThis.providerToRetryCountMap = {};
    oThis.siblingProviders = null;
  }

  /***
   *
   * Sign transaction and submit on chain.
   *
   * @return {Promise<*>}
   */
  async perform() {
    const oThis = this;

    await oThis._initializeWeb3Instance();

    oThis._sanitizeTxOptions();

    await oThis._fetchPrivateKey();

    await oThis._fetchNonce();

    oThis._setSignedTransaction();

    let promiseObj = new Promise(function(onResolve, onReject) {
      oThis.promiseContext.resolve = onResolve;
      oThis.promiseContext.reject = onReject;
    });

    oThis._executeAsBatchRequest();

    return promiseObj;
  }

  /**
   * Set signed transaction
   *
   * @private
   */
  _setSignedTransaction() {
    const oThis = this;

    oThis.signedTransaction = '0x' + oThis._signTransactionLocally()['serializedTx'].toString('hex');
  }

  /**
   * Execute batch transaction.
   *
   * @private
   */
  _executeAsBatchRequest() {
    const oThis = this;

    oThis._initializeBatchRequest();

    let sendSignedTransactionRequest = oThis.web3Instance.eth.sendSignedTransaction.request(
      oThis.signedTransaction,
      function(err, txHash) {
        return oThis._afterSubmitCallback(err, txHash);
      }
    );

    oThis.batchRequest.add(sendSignedTransactionRequest);
    oThis.batchRequest.execute();
  }

  /**
   * After Submit callback
   *
   * @param err
   * @param txHash
   * @returns {Promise}
   * @private
   */
  async _afterSubmitCallback(err, txHash) {
    const oThis = this;

    if (err) {
      return oThis._submitErrorHandler(err);
    }

    if (oThis.afterReceipt) {
      let toReject = false;
      await oThis._createPendingTransaction(txHash).catch(function(err) {
        logger.error(err);
        toReject = true;
      });
      if (toReject)
        return oThis.promiseContext.reject(
          responseHelper.error({
            internal_error_identifier: 'l_t_sstoc_7',
            api_error_identifier: 'something_went_wrong',
            debug_options: { txHash: txHash }
          })
        );
    }

    if (oThis.waitTillReceipt) {
      let transactionReceipt = await oThis._getTxReceipt(txHash);
      return oThis.promiseContext.resolve(
        responseHelper.successWithData({
          transactionHash: txHash.toLowerCase(),
          transactionReceipt: transactionReceipt
        })
      );
    }

    return oThis.promiseContext.resolve(responseHelper.successWithData({ transactionHash: txHash.toLowerCase() }));
  }

  /**
   * conditionally Retry after error occurred.
   *
   * @param err
   * @returns {Promise<*>}
   * @private
   */
  async _submitErrorHandler(err) {
    const oThis = this;

    let errCode = oThis._identifyError(err);
    logger.error('_afterSubmitCallback-----error--', errCode);

    if (errCode.indexOf(errorConstant.gethDown) > -1) {
      logger.info('errCode-----------------', errCode);
      let gethProvider = await oThis._getSiblingGethProvider(oThis.chainId);
      if (gethProvider) {
        logger.error('Transaction could not be submitted trying to submit on --', gethProvider);
        oThis.web3Instance = web3Provider.getInstance(gethProvider).web3WsProvider;
        setImmediate(function() {
          oThis._executeAsBatchRequest();
        });
        return true;
      }
    }

    return oThis.promiseContext.reject(
      responseHelper.error({
        internal_error_identifier: errCode,
        api_error_identifier: 'something_went_wrong',
        debug_options: { errCode: errCode }
      })
    );
  }

  /**
   * Get sibling geth providers along with original.
   *
   * @returns {Promise}
   * @private
   */
  async _getSiblingGethProvider() {
    const oThis = this;

    logger.info('oThis.siblingProviders-----------------', oThis.siblingProviders);
    if (!oThis.siblingProviders) {
      let response = await chainConfigProvider.getFor([oThis.chainId]),
        chainConfig = response[oThis.chainId];

      oThis.siblingProviders = [];
      if (chainConfig.auxGeth.readWrite.wsProviders.includes(oThis.web3ProviderPath)) {
        oThis.siblingProviders = chainConfig.auxGeth.readWrite.wsProviders;
      } else if (chainConfig.originGeth.readWrite.wsProviders.includes(oThis.web3ProviderPath)) {
        oThis.siblingProviders = chainConfig.originGeth.readWrite.wsProviders;
      }

      oThis.siblingProviders = basicHelper.shuffleArray(oThis.siblingProviders);
    }

    logger.info('oThis.providerToRetryCountMap----------------------------------', oThis.providerToRetryCountMap);
    for (let i = 0; i < oThis.siblingProviders.length; i++) {
      let provider = oThis.siblingProviders[i];

      oThis.providerToRetryCountMap[provider] = oThis.providerToRetryCountMap[provider] || 0;
      if (oThis.providerToRetryCountMap[provider] < maxRetryCount) {
        oThis.providerToRetryCountMap[provider] = oThis.providerToRetryCountMap[provider] + 1;
        return provider;
      }
    }
    return false;
  }

  /**
   *
   * Identify type of error occurred.
   *
   * @param err
   * @returns {string}
   * @private
   */
  _identifyError(err) {
    logger.error('_identifyError--From--', err);

    let errMsg = err.message;

    if (errMsg.indexOf('Invalid JSON RPC response') > -1 || errMsg.indexOf('connection not open') > -1) {
      return 'l_t_sstoc_1:' + errorConstant.gethDown;
    } else if (errMsg.indexOf('nonce too low') > -1 || errMsg.indexOf('Transaction nonce is too low') > -1) {
      return 'l_t_sstoc_2:' + errorConstant.nonceTooLow;
    } else if (errMsg.indexOf('insufficient funds for gas * price + value') > -1) {
      return 'l_t_sstoc_3:' + errorConstant.insufficientGas;
    } else if (errMsg.indexOf('replacement transaction underpriced') > -1 || errMsg.indexOf('known transaction') > -1) {
      // with a nonce which was already used,
      // 1. if same rawTx was resubmitted -> known transaction error is raised
      // 2. if some other rawTx was submitted -> replacement transaction underpriced
      return 'l_t_sstoc_4:' + errorConstant.replacementTxUnderpriced;
    } else {
      return 'l_t_sstoc_6:' + errorConstant.unKnownTxError;
    }
  }

  /**
   * Get Tx Receipt
   *
   * @param transactionHash
   * @return {Promise<any>}
   * @private
   */
  _getTxReceipt(transactionHash) {
    const oThis = this;

    let maxRetries = 100;

    return new Promise(function(onResolve, onReject) {
      const tryReceipt = function() {
        setTimeout(function() {
          oThis.web3Instance.eth.getTransactionReceipt(transactionHash).then(handleResponse);
        }, 5000);
      };

      const handleResponse = function(response) {
        maxRetries--;

        if (!maxRetries)
          return onReject(
            responseHelper.error({
              internal_error_identifier: 'l_t_sstoc_8',
              api_error_identifier: 'something_went_wrong',
              debug_options: { errMsg: 'max retries for getting tx receipt exceeded for tx hash: ' + transactionHash }
            })
          );

        if (response) {
          return onResolve(response);
        } else {
          logger.info('Waiting for ' + transactionHash + ' to be mined');
          tryReceipt();
        }
      };

      tryReceipt();
    });
  }

  /**
   * Append chain id to tx options
   *
   * @private
   */
  _sanitizeTxOptions() {
    const oThis = this;

    // append chain id to txOptions
    oThis.txOptions.chainId = Number(oThis.chainId);

    // convert to hex. since we are signing the tx here, the value should mandatorily be in HEX.
    let value = new BigNumber(oThis.txOptions.value || 0);
    oThis.txOptions.value = '0x' + value.toString(16);
  }

  /**
   * Get private key for the fromAddress
   *
   * @returns {promise}
   *
   * @private
   */
  async _fetchPrivateKey() {
    const oThis = this;

    let addressPrivateKeyCache = new AddressPrivateKeyCache({ address: oThis.txOptions.from }),
      cacheFetchRsp = await addressPrivateKeyCache.fetchDecryptedData(),
      privateKey = cacheFetchRsp.data['private_key_d'];

    // Get private key - this should be the private key without 0x at the beginning.
    if (privateKey.slice(0, 2).toLowerCase() === '0x') {
      privateKey = privateKey.substr(2);
    }

    //IMPORTANT: The below code is meant for security. Its not overhead. Its security.
    let privateKeyObj = new Buffer(privateKey, 'hex');

    oThis._signTransactionLocally = function() {
      //Create a copy of oThis.txOptions because outside code may
      //be trying to read 'gas' property and expects it in decimal.
      let txOptions = Object.assign({}, oThis.txOptions);

      if (txOptions.gas) {
        //Notes about web3.utils.toHex
        // web3.utils.toHex(7000000) // => '0x6acfc0'
        // web3.utils.toHex('7000000') // => '0x6acfc0'
        // web3.utils.toHex('0x6acfc0') // => '0x6acfc0'
        // web3.utils.toHex(0x6acfc0) // => '0x6acfc0'
        // Points:
        //  - interprets String('7000000') as Number('7000000')
        //  - It is safe to pass hex values, returns the same back.

        //IMPORTANT NOTE: This is the only place in code-base where 'gasLimit' should be used.
        txOptions.gas = Web3Util.toHex(txOptions.gas);
      }

      let tx = new Tx(txOptions);
      tx.sign(privateKeyObj);

      return {
        serializedTx: tx.serialize()
      };
    };
  }

  _signTransactionLocally() {
    throw 'private key not fetched';
  }

  /***
   *
   * Create Pending transaction in Db
   *
   * @return {Promise<*>}
   */
  _createPendingTransaction(txHash) {
    const oThis = this;

    return new PendingTransactionCrud(oThis.chainId).create({
      transactionData: oThis.pendingTransaction,
      transactionHash: txHash,
      afterReceipt: oThis.afterReceipt
    });
  }

  /***
   *
   * Create Web 3 instance if not provided from outside.
   *
   * @return {Promise<*>}
   */
  async _initializeWeb3Instance() {
    const oThis = this;

    if (!oThis.web3Instance) {
      oThis.web3Instance = web3Provider.getInstance(oThis.web3ProviderPath).web3WsProvider;
    }
    oThis._getHost();
    return false;
  }

  /**
   * extract host name from web3 instance.
   *
   * @returns {boolean}
   * @private
   *
   */
  _getHost() {
    const oThis = this;

    //console.log("oThis.web3Instance------------------", oThis.web3Instance.eth.net._provider.connection._url);
    //console.log("oThis.web3Instance-------2-----------", oThis.web3Instance.endPointUrl);

    if (!oThis.web3ProviderPath) {
      oThis.web3ProviderPath = oThis.web3Instance.host ? oThis.web3Instance.host : oThis.web3Instance.endPointUrl;
    }
    oThis.providerToRetryCountMap[oThis.web3ProviderPath] = 0;
    console.log('oThis.providerToRetryCountMap0-0000----0000------', oThis.providerToRetryCountMap);

    return false;
  }

  /***
   *
   * Remove address from wallet
   *
   * @return {Promise<*>}
   */
  async _removeAddressFromWallet() {
    const oThis = this;

    if (oThis.signerWeb3Object) {
      await oThis.signerWeb3Object.removeAddressKey(oThis.txOptions.from);
    }
  }

  /***
   * Fetch Nonce of From address to submit transaction
   *
   * @return {object}
   */
  async _fetchNonce() {
    const oThis = this;

    if (oThis.txOptions.nonce) {
      return;
    }

    let resp = await new NonceGetForTransaction({
      address: oThis.txOptions.from,
      chainId: oThis.chainId
    }).getNonce();

    if (resp.isSuccess()) {
      oThis.txOptions.nonce = resp.data.nonce;
      oThis.pendingTransaction.nonce = oThis.txOptions.nonce;
    } else {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_t_sstoc_9',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            errMsg: 'fetch nonce returned error for: ' + oThis.txOptions.from + ' on chain: ' + oThis.chainId
          }
        })
      );
    }
  }

  /**
   * Initialize batch request
   *
   * @private
   */
  _initializeBatchRequest() {
    const oThis = this;

    let BatchRequestKlass = oThis.web3Instance.BatchRequest || oThis.web3Instance.eth.BatchRequest;

    oThis.batchRequest = new BatchRequestKlass();
  }
}

module.exports = SignSubmitTrxOnChain;
