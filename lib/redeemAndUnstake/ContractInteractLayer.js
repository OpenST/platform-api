const MosaicJs = require('@openst/mosaic.js'),
  rootPrefix = '../..',
  CoreAbis = require(rootPrefix + '/config/CoreAbis');

class ContractInteractLayer {
  constructor() {}

  /**
   * Method to get executable data for StPrime.wrap
   *
   * @param web3
   * @param stPrimeContractAddress
   * @returns {Promise<any>}
   */
  static async getWrapData(web3, stPrimeContractAddress) {
    const stPrimeContractObj = new MosaicJs.ContractInteract.OSTPrime(web3, stPrimeContractAddress);

    let txObject = await stPrimeContractObj.wrapRawTx();

    return Promise.resolve(txObject.encodeABI());
  }

  /**
   * Method to get executable data for CoGateway.redeem
   *
   * @param web3
   * @param coGatewayAddress
   * @param redeemerNonce
   * @param amount
   * @param beneficiary
   * @param hashLock
   * @returns {Promise<any>}
   */
  static async getRedeemData(web3, coGatewayAddress, redeemerNonce, amount, beneficiary, hashLock) {
    const coGatewayContractObj = new MosaicJs.ContractInteract.EIP20CoGateway(web3, coGatewayAddress);

    // Gas price and gas limit varibales are used for bounty, so 0 for now.
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
   * Method to get reedemer nonce
   *
   * @param web3
   * @param coGatewayAddress
   * @param redeemerAddress
   * @returns {Promise<Object>}
   */
  static async getRedeemerNonce(web3, coGatewayAddress, redeemerAddress) {
    const coGatewayContractObj = new MosaicJs.ContractInteract.EIP20CoGateway(web3, coGatewayAddress);

    const nonce = await coGatewayContractObj.getNonce(redeemerAddress);

    return nonce;
  }

  /**
   * Method to get Approve data on St Prime
   *
   * @param web3
   * @param stPrimeContractAddress
   * @param spenderAddress
   * @param amountToApprove
   * @returns {Promise<any>}
   */
  static async getApproveData(web3, stPrimeContractAddress, spenderAddress, amountToApprove) {
    const stPrimeContractObj = new MosaicJs.ContractInteract.OSTPrime(web3, stPrimeContractAddress);

    let txObject = await stPrimeContractObj.approveRawTx(spenderAddress, amountToApprove);

    return Promise.resolve(txObject.encodeABI());
  }

  /**
   * Method to get prove Co-Gateway on Gateway executable data
   *
   * @param web3
   * @param gatewayContractAddress
   * @param blockHeight
   * @param encodedAccount
   * @param accountProof
   * @returns {Promise<any>}
   */
  static async getProveCoGatewayOnGatewayData(web3, gatewayContractAddress, blockHeight, encodedAccount, accountProof) {
    const gatewayContractObj = new MosaicJs.ContractInteract.EIP20Gateway(web3, gatewayContractAddress);

    let txObject = await gatewayContractObj.proveGatewayRawTx(blockHeight, encodedAccount, accountProof);

    return Promise.resolve(txObject.encodeABI());
  }

  /**
   * Method to get Confirm Redeem intent data on Gateway
   *
   * @param web3
   * @param gatewayContractAddress
   * @param redeemer
   * @param nonce
   * @param beneficiary
   * @param amount
   * @param gasPrice
   * @param gasLimit
   * @param blockHeight
   * @param hashLock
   * @param storageProof
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

    let txObject = await gatewayContractObj.confirmRedeemIntentRawTx(
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
   * Method to get Progress redeem data
   *
   * @param web3
   * @param coGatewayAddress
   * @param messageHash
   * @param unlockSecret
   * @returns {Promise<any>}
   */
  static async getProgressRedeemData(web3, coGatewayAddress, messageHash, unlockSecret) {
    const coGatewayContractObj = new MosaicJs.ContractInteract.EIP20CoGateway(web3, coGatewayAddress);

    // Gas price and gas limit varibales are used for bounty, so 0 for now.
    const txObject = await coGatewayContractObj.progressRedeemRawTx(messageHash, unlockSecret);

    return Promise.resolve(txObject.encodeABI());
  }

  /**
   * Method to get Progress unstake data
   *
   * @param web3
   * @param gatewayContractAddress
   * @param messageHash
   * @param unlockSecret
   * @returns {Promise<any>}
   */
  static async getProgressUnstakeData(web3, gatewayContractAddress, messageHash, unlockSecret) {
    const gatewayContractObj = new MosaicJs.ContractInteract.EIP20Gateway(web3, gatewayContractAddress);

    let txObject = await gatewayContractObj.progressUnstakeRawTx(messageHash, unlockSecret);

    return Promise.resolve(txObject.encodeABI());
  }

  // TODO: Below methods would be removed once interact layer comes in openst js

  /**
   * Get Co-gateway redeem executable data
   *
   * @param web3
   * @param amount
   * @param beneficiary
   * @param gasPrice
   * @param gasLimit
   * @param nonce
   * @param hashLock
   * @returns {String|*}
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
   * Get token holder execute redemption call prefix
   *
   * @param web3
   * @returns {string | *}
   */
  static getTokenHolderExecuteRedemptionCallPrefix(web3) {
    const executeRedemptionHash = web3.utils.soliditySha3(
      'executeRedemption(address,bytes,uint256,uint8,bytes32,bytes32)'
    );
    const executeRedemotionCallPrefix = executeRedemptionHash.substring(0, 10);
    return executeRedemotionCallPrefix;
  }

  static async executeRedemptionRawTx(web3, contractAddress, to, data, nonce, r, s, v) {
    let abi = CoreAbis.getAbi('TokenHolder');

    let contractObj = new web3.eth.Contract(abi, contractAddress);

    console.log('contractObj', contractObj);

    let rawTx = await contractObj.methods.executeRedemption(to, data, nonce, r, s, v);

    return Promise.resolve(rawTx.encodeABI());
  }
}

module.exports = ContractInteractLayer;
