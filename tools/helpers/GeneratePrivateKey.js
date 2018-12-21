'use strict';

/**
 * Generate private key
 *
 * @module tools/chainSetup/helpers/GeneratePrivateKey
 */

const rootPrefix = '../..',
  Web3 = require('web3'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

class GenerateRawKeyKlass {
  constructor() {}

  /**
   * Perform<br><br>
   *
   * @return {result}
   */
  perform() {
    const web3Object = new Web3();
    //TODO - verify entropy standard
    let newAddress = web3Object.eth.accounts.create(web3Object.utils.randomHex(32));

    return responseHelper.successWithData({ address: newAddress.address, privateKey: newAddress.privateKey });
  }
}

module.exports = GenerateRawKeyKlass;
