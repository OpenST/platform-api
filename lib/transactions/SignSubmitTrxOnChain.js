'use strict';

/**
 * Module to sign and submit transaction on chain.
 *
 * @module lib/transactions/submitTransactionOnChain
 */

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  CreatePendingTransaction = require(rootPrefix + '/lib/transactions/CreatePendingTransaction'),
  signerWeb3Provider = require(rootPrefix + '/lib/providers/signerWeb3'),
  NonceManager = require(rootPrefix + '/lib/nonce/Manager'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

class SignSubmitTrxOnChain {
  /**
   *
   * @param params {object} - params object
   * @param params.chainId {number} - Chain Id
   * @param params.web3Instance {Object} - Web 3 Instance
   * @param params.provider {String} - Web 3 provider to create web 3 instance
   * @param params.txOptions {Object} - Transaction object
   * @param params.options {Object} - Extra Options
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.chainId = params.chainId;
    oThis.web3Instance = params.web3Instance;
    oThis.web3ProviderPath = params.provider;
    oThis.txOptions = params.txOptions;
    oThis.extraData = params.options;
    oThis.pendingTransaction = params.txOptions;
    oThis.signerWeb3Object = null;
  }

  /***
   *
   * Sign transaction and submit on chain.
   *
   * @return {Promise<*>}
   */
  async perform() {
    const oThis = this;

    // append chainId to txOptions
    oThis.txOptions.chainId = oThis.chainId;

    return new Promise(async function(onResolve, onReject) {
      const afterSubmitCallback = function(err, txHash) {
        oThis._removeAddressFromWallet();
        if (err) {
          logger.error(err);
          return onReject();
        }
        oThis._createPendingTransaction(txHash).then(function(resp) {
          return onResolve(responseHelper.successWithData({ transactionHash: txHash.toLowerCase() }));
        });
      };

      await oThis._createWeb3Instance();

      let BatchRequestKlass = oThis.web3Instance.BatchRequest || oThis.web3Instance.eth.BatchRequest,
        batchRequest = new BatchRequestKlass(),
        walletWeb3 = oThis.web3Instance.eth.accounts.wallet[oThis.txOptions.from.toLowerCase()];

      // If user not found in wallet
      if (!walletWeb3) {
        logger.error('User account not found in Web3');
        return onReject('User account not found in Web3');
      }

      await oThis._fetchNonce();

      let signedTransaction = await walletWeb3.signTransaction(oThis.txOptions);

      // Add input tx options with signed transaction to be used further
      Object.assign(oThis.pendingTransaction, signedTransaction);

      let sendSignedTransactionRequest = oThis.web3Instance.eth.sendSignedTransaction.request(
        signedTransaction.rawTransaction,
        afterSubmitCallback
      );

      batchRequest.add(sendSignedTransactionRequest);
      batchRequest.execute();
    });
  }

  /***
   *
   * Create Pending transaction in Db
   *
   * @return {Promise<*>}
   */
  _createPendingTransaction(txHash) {
    const oThis = this;

    return new CreatePendingTransaction(oThis.chainId).insertPendingTransaction(
      oThis.pendingTransaction,
      txHash,
      oThis.extraData
    );
  }

  /***
   *
   * Create Web 3 instance if not provided from outside.
   *
   * @return {Promise<*>}
   */
  async _createWeb3Instance() {
    const oThis = this;

    if (oThis.web3Instance) {
      return;
    }

    oThis.signerWeb3Object = new signerWeb3Provider(oThis.web3ProviderPath, oThis.txOptions.from);
    oThis.web3Instance = await oThis.signerWeb3Object.getInstance();
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

    let resp = await new NonceManager({
      address: oThis.txOptions.from,
      chainId: oThis.chainId
    }).getNonce();

    if (resp.isSuccess()) {
      oThis.txOptions.nonce = resp.data.nonce;
      oThis.pendingTransaction.nonce = oThis.txOptions.nonce;
    }
  }
}

module.exports = SignSubmitTrxOnChain;
