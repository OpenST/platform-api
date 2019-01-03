'use strict';
/**
 * Web3 WS provider
 *
 * @module lib/providers/web3
 */
const OSTBase = require('@openstfoundation/openst-base');

const rootPrefix = '../../',
  coreConstants = require(rootPrefix + 'config/coreConstants');

const web3PoolFactory = OSTBase.OstWeb3Pool.Factory;

/**
 * Class for web3 interact
 *
 * @class
 */
class Web3Interact {
  /**
   * Web3 Interact constructor
   *
   * @param  {String} wsProvider: WS provider
   *
   * @constructor
   */
  constructor(wsProvider) {
    const oThis = this;

    oThis.wsProvider = wsProvider;
  }

  /**
   * Returns the web3 WS provider
   *
   * @returns {*}
   */
  get web3WsProvider() {
    const oThis = this;

    return web3PoolFactory.getWeb3(oThis.wsProvider);
  }

  /**
   * Get transaction receipt of a given transaction hash
   *
   * @param  {String} transactionHash: Transaction Hash
   *
   * @returns {Promise}
   */
  getReceipt(transactionHash) {
    const oThis = this;

    return oThis.web3WsProvider.eth.getTransactionReceipt(transactionHash);
  }

  /**
   * Get block details using a block number
   *
   * @param  {Integer} blockNumber: Block Number
   *
   * @returns {Promise}
   */
  async getBlock(blockNumber) {
    let retryCount = 0;
    const oThis = this,
      blockRetryCount = coreConstants.blockRetryCount;

    return new Promise(async function(onResolve) {
      const getCompleteBlock = async function(blockNumber) {
        retryCount++;
        let blockResponse = await oThis.web3WsProvider.eth.getBlock(blockNumber, false);

        if (blockResponse) {
          retryCount = 0;
          return onResolve(blockResponse);
        } else {
          if (retryCount < blockRetryCount) {
            setImmediate(function() {
              getCompleteBlock(blockNumber);
            });
          } else {
          }
        }
      };

      getCompleteBlock(blockNumber);
    });
  }

  /**
   * Get block number
   *
   * @returns {Promise}
   */
  getBlockNumber() {
    const oThis = this;

    return oThis.web3WsProvider.eth.getBlockNumber();
  }

  /**
   * Get transaction details using a transaction hash
   *
   * @param {String} transactionHash
   *
   * @returns {Promise<>}
   */
  getTransaction(transactionHash) {
    const oThis = this;

    return oThis.web3WsProvider.eth.getTransaction(transactionHash);
  }

  /**
   * Get Contract Object using an abi and contract address
   *
   * @param {String} abi
   * @param {String} contractAddress
   *
   * @returns {Object}
   */
  getContractObject(abi, contractAddress) {
    const oThis = this;

    return new oThis.web3WsProvider.eth.Contract(abi, contractAddress);
  }
}

/**
 * Class for Web3Interact provider
 *
 * @class
 */
class Web3Provider {
  /**
   * Returns a web3 instance
   *
   * @param provider {String}: URL of the node
   *
   * @returns {Web3Interact}
   */
  getInstance(provider) {
    return new Web3Interact(provider);
  }
}

module.exports = new Web3Provider();
