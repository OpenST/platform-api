'use strict';
/**
 * Web3 WS provider with signer key to submit transaction
 *
 * @module lib/providers/signerWeb3
 */

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  AddressPrivateKeyCache = require(rootPrefix + '/lib/sharedCacheManagement/AddressPrivateKey'),
  web3Provider = require(rootPrefix + '/lib/providers/web3');

class SignerWeb3 {
  constructor() {
    const oThis = this;

    oThis.web3Instance = null;
  }

  /**
   * Returns a web3 instance
   *
   * @param provider {String}: URL of the node
   * @param address {String}: Address whose private key needs to be added.
   *
   * @returns {Web3Interact}
   */
  async getInstance(provider, address) {
    const oThis = this;

    oThis.web3Instance = web3Provider.getInstance(provider).web3WsProvider;

    if (address) {
      await oThis.addAddressKey(address);
    }

    return oThis.web3Instance;
  }

  /**
   * Add Private key of an address
   *
   * @returns {*}
   */
  async addAddressKey(address) {
    const oThis = this;

    let addressPrivateKeyCache = new AddressPrivateKeyCache({ address: address }),
      cacheFetchRsp = await addressPrivateKeyCache.fetchDecryptedData(),
      signerKey = cacheFetchRsp.data['private_key_d'];

    oThis.web3Instance.eth.accounts.wallet.add(signerKey);
    return oThis.web3Instance;
  }

  /**
   * Remove Private key of an address from web3 instance
   *
   * @returns {*}
   */
  async removeAddressKey(address) {
    const oThis = this;

    let addressPrivateKeyCache = new AddressPrivateKeyCache({ address: address }),
      cacheFetchRsp = await addressPrivateKeyCache.fetchDecryptedData(),
      signerKey = cacheFetchRsp.data['private_key_d'];

    oThis.web3Instance.eth.accounts.wallet.remove(signerKey);
    return oThis.web3Instance;
  }
}

module.exports = new SignerWeb3();
