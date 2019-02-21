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
  Web3Util = require('web3-utils');

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

    oThis._initializeBatchRequest();

    return new Promise(async function(onResolve, onReject) {
      const afterSubmitCallback = async function(err, txHash) {
        if (err) {
          logger.error(err);
          return onReject();
        }

        if (oThis.afterReceipt) {
          let toReject = false;
          await oThis._createPendingTransaction(txHash).catch(function(err) {
            logger.error(err);
            toReject = true;
          });
          if (toReject) return onReject();
        }

        if (oThis.waitTillReceipt) {
          let transactionReceipt = await oThis._getTxReceipt(txHash);
          return onResolve(
            responseHelper.successWithData({
              transactionHash: txHash.toLowerCase(),
              transactionReceipt: transactionReceipt
            })
          );
        }

        return onResolve(responseHelper.successWithData({ transactionHash: txHash.toLowerCase() }));
      };

      let signedTransaction = '0x' + oThis._signTransactionLocally()['serializedTx'].toString('hex');

      let sendSignedTransactionRequest = oThis.web3Instance.eth.sendSignedTransaction.request(
        signedTransaction,
        afterSubmitCallback
      );

      oThis.batchRequest.add(sendSignedTransactionRequest);
      oThis.batchRequest.execute();
    });
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

        if (!maxRetries) return onReject('max retries for getting tx receipt exceeded for tx hash: ' + transactionHash);

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

    if (oThis.web3Instance) {
      return;
    }

    oThis.web3Instance = web3Provider.getInstance(oThis.web3ProviderPath).web3WsProvider;
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
      return Promise.reject('fetch nonce returned error for: ' + oThis.txOptions.from + ' on chain: ' + oThis.chainId);
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
