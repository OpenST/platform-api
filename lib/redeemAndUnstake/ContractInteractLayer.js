/**
 * Module for contract interaction layer.
 *
 * @module lib/redeemAndUnstake/ContractInteractLayer
 */

const MosaicJs = require('@openst/mosaic.js');

const rootPrefix = '../..',
  CoreAbis = require(rootPrefix + '/config/CoreAbis');

/**
 * Class for contract interaction layer.
 *
 * @class ContractInteractLayer
 */
class ContractInteractLayer {
  /**
   * Method to get executable data for StPrime.wrap
   *
   * @param {object} web3
   * @param {string} stPrimeContractAddress
   *
   * @returns {Promise<any>}
   */
  static async getWrapData(web3, stPrimeContractAddress) {
    const stPrimeContractObj = new MosaicJs.ContractInteract.OSTPrime(web3, stPrimeContractAddress);

    const txObject = await stPrimeContractObj.wrapRawTx();

    return Promise.resolve(txObject.encodeABI());
  }

  /**
   * Method to get executable data for CoGateway.redeem.
   *
   * @param {object} web3
   * @param {string} coGatewayAddress
   * @param {string} redeemerNonce
   * @param {string} amount
   * @param {string} beneficiary
   * @param {string} hashLock
   *
   * @returns {Promise<any>}
   */
  static async getRedeemData(web3, coGatewayAddress, redeemerNonce, amount, beneficiary, hashLock) {
    const coGatewayContractObj = new MosaicJs.ContractInteract.EIP20CoGateway(web3, coGatewayAddress);

    // Gas price and gas limit variables are used for bounty, so 0 for now.
    const gasPrice = '0',
      gasLimit = '0',
      txObject = await coGatewayContractObj.redeemRawTx(
        amount,
        beneficiary,
        gasPrice,
        gasLimit,
        redeemerNonce,
        hashLock
      );

    return Promise.resolve(txObject.encodeABI());
  }

  /**
   * Method to get redeemer nonce.
   *
   * @param {object} web3
   * @param {string} coGatewayAddress
   * @param {string} redeemerAddress
   *
   * @returns {Promise<Object>}
   */
  static async getRedeemerNonce(web3, coGatewayAddress, redeemerAddress) {
    const coGatewayContractObj = new MosaicJs.ContractInteract.EIP20CoGateway(web3, coGatewayAddress);

    const nonce = await coGatewayContractObj.getNonce(redeemerAddress);

    return nonce;
  }

  /**
   * Method to get approve data on St Prime.
   *
   * @param {object} web3
   * @param {string} stPrimeContractAddress
   * @param {string} spenderAddress
   * @param {string} amountToApprove
   *
   * @returns {Promise<any>}
   */
  static async getApproveData(web3, stPrimeContractAddress, spenderAddress, amountToApprove) {
    const stPrimeContractObj = new MosaicJs.ContractInteract.OSTPrime(web3, stPrimeContractAddress);

    const txObject = await stPrimeContractObj.approveRawTx(spenderAddress, amountToApprove);

    return Promise.resolve(txObject.encodeABI());
  }

  /**
   * Method to get prove Co-Gateway on Gateway executable data.
   *
   * @param {object} web3
   * @param {string} gatewayContractAddress
   * @param {string} blockHeight
   * @param {string} encodedAccount
   * @param {string} accountProof
   *
   * @returns {Promise<any>}
   */
  static async getProveCoGatewayOnGatewayData(web3, gatewayContractAddress, blockHeight, encodedAccount, accountProof) {
    const gatewayContractObj = new MosaicJs.ContractInteract.EIP20Gateway(web3, gatewayContractAddress);

    const txObject = await gatewayContractObj.proveGatewayRawTx(blockHeight, encodedAccount, accountProof);

    return Promise.resolve(txObject.encodeABI());
  }

  /**
   * Method to get Confirm Redeem intent data on Gateway.
   *
   * @param {object} web3
   * @param {string} gatewayContractAddress
   * @param {string} redeemer
   * @param {string} nonce
   * @param {string} beneficiary
   * @param {string} amount
   * @param {string} gasPrice
   * @param {string} gasLimit
   * @param {string} blockHeight
   * @param {string} hashLock
   * @param {string} storageProof
   *
   * @returns {Promise<any>}
   */
  static async getConfirmRedeemIntentData(
    web3,
    gatewayContractAddress,
    redeemer,
    nonce,
    beneficiary,
    amount,
    gasPrice,
    gasLimit,
    blockHeight,
    hashLock,
    storageProof
  ) {
    const gatewayContractObj = new MosaicJs.ContractInteract.EIP20Gateway(web3, gatewayContractAddress);

    const txObject = await gatewayContractObj.confirmRedeemIntentRawTx(
      redeemer,
      nonce,
      beneficiary,
      amount,
      gasPrice,
      gasLimit,
      blockHeight,
      hashLock,
      storageProof
    );

    return Promise.resolve(txObject.encodeABI());
  }

  /**
   * Method to get progress redeem data.
   *
   * @param {object} web3
   * @param {string} coGatewayAddress
   * @param {string} messageHash
   * @param {string} unlockSecret
   *
   * @returns {Promise<any>}
   */
  static async getProgressRedeemData(web3, coGatewayAddress, messageHash, unlockSecret) {
    const coGatewayContractObj = new MosaicJs.ContractInteract.EIP20CoGateway(web3, coGatewayAddress);

    // Gas price and gas limit variables are used for bounty, so 0 for now.
    const txObject = await coGatewayContractObj.progressRedeemRawTx(messageHash, unlockSecret);

    return Promise.resolve(txObject.encodeABI());
  }

  /**
   * Method to get progress unstake data.
   *
   * @param {object} web3
   * @param {string} gatewayContractAddress
   * @param {string} messageHash
   * @param {string} unlockSecret
   *
   * @returns {Promise<any>}
   */
  static async getProgressUnstakeData(web3, gatewayContractAddress, messageHash, unlockSecret) {
    const gatewayContractObj = new MosaicJs.ContractInteract.EIP20Gateway(web3, gatewayContractAddress);

    const txObject = await gatewayContractObj.progressUnstakeRawTx(messageHash, unlockSecret);

    return Promise.resolve(txObject.encodeABI());
  }

  // TODO: Below methods would be removed once interact layer comes in openst js

  /**
   * Get Co-gateway redeem executable data.
   *
   * @param {object} web3
   * @param {string} amount
   * @param {string} beneficiary
   * @param {string} gasPrice
   * @param {string} gasLimit
   * @param {string} nonce
   * @param {string} hashLock
   *
   * @returns {string|*}
   */
  static getCoGatewayRedeemExecutableData(web3, amount, beneficiary, gasPrice, gasLimit, nonce, hashLock) {
    return web3.eth.abi.encodeFunctionCall(
      {
        name: 'redeem',
        type: 'function',
        inputs: [
          {
            type: 'uint256',
            name: 'amount'
          },
          {
            type: 'address',
            name: 'beneficiary'
          },
          {
            type: 'uint256',
            name: 'gasPrice'
          },
          {
            type: 'uint256',
            name: 'gasLimit'
          },
          {
            type: 'uint256',
            name: 'nonce'
          },
          {
            type: 'bytes32',
            name: 'hashlock'
          }
        ]
      },
      [amount, beneficiary, gasPrice, gasLimit, nonce, hashLock]
    );
  }

  /**
   * Get token holder execute redemption call prefix.
   *
   * @param {object} web3
   *
   * @returns {string | *}
   */
  static getTokenHolderExecuteRedemptionCallPrefix(web3) {
    const executeRedemptionHash = web3.utils.soliditySha3(
      'executeRedemption(address,bytes,uint256,bytes32,bytes32,uint8)'
    );

    return executeRedemptionHash.substring(0, 10);
  }

  /**
   * Get execute redemption raw transaction.
   *
   * @param {object} web3
   * @param {string} contractAddress
   * @param {string} to
   * @param {string} data
   * @param {string} nonce
   * @param {string} r
   * @param {string} s
   * @param {string} v
   *
   * @return {Promise<any>}
   */
  static async executeRedemptionRawTx(web3, contractAddress, to, data, nonce, r, s, v) {
    const abi = CoreAbis.getAbi('TokenHolder');

    const contractObj = new web3.eth.Contract(abi, contractAddress);

    const rawTx = await contractObj.methods.executeRedemption(to, data, nonce, r, s, v);

    return Promise.resolve(rawTx.encodeABI());
  }
}

module.exports = ContractInteractLayer;
