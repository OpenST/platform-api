'use strict';

/**
 * This file will be used as helper to fetch contract methods and objects
 *
 * @module helpers/contractHelper
 */

const MosaicTbd = require('mosaic-tbd');

class ContractHelper {
  constructor() {}

  /**
   * This function fetches mosaic contract object
   *
   * @param {String} web3Instance
   * @param {String} contractName
   * @param {String} contractAddress
   *
   * @returns {Contract}
   */
  getMosaicTbdContractObj(web3Instance, contractName, contractAddress) {
    const oThis = this;

    let abi = oThis.MosaicBinProvider.getABI(contractName);

    return new web3Instance.eth.Contract(abi, contractAddress);
  }

  /**
   * This function fetches mosaic Provider
   *
   * @returns {Provider}
   */
  get MosaicBinProvider() {
    return new MosaicTbd.AbiBinProvider();
  }
}

module.exports = new ContractHelper();
