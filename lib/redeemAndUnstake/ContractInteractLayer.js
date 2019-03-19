const MosaicJs = require('@openstfoundation/mosaic.js');

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
}

module.exports = ContractInteractLayer;
