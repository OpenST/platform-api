'use strict';
/**
 * Web3 WS provider with signer key to submit transaction
 *
 * @module lib/providers/signerWeb3
 */

const rootPrefix = '../..',
  AddressPrivateKeyCache = require(rootPrefix + '/lib/sharedCacheManagement/AddressPrivateKey'),
  web3Provider = require(rootPrefix + '/lib/providers/web3');

class SignerWeb3 {
  /**
   * Constructor
   *
   * @param provider {String}: URL of the node
   * @param address {String} (Optional): Address whose private key needs to be added.
   *
   */
  constructor(provider, address) {
    const oThis = this;

    oThis.provider = provider;
    oThis.address = address;

    oThis.web3Instance = null;
  }

  /**
   * Returns a web3 instance
   *
   * @returns {Web3Interact}
   */
  async getInstance() {
    const oThis = this;

    oThis.web3Instance = web3Provider.getInstance(oThis.provider).web3WsProvider;

    if (oThis.address) {
      await oThis.addAddressKey(oThis.address);
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

    //0x9d9d5c2188cb8b64f9e43277f90e5a834dc7e06c77d67fda5bc66881a6f910cb
    // let addressPrivateKeyCache = new AddressPrivateKeyCache({ address: address }),
    //   cacheFetchRsp = await addressPrivateKeyCache.fetchDecryptedData(),
    //   signerKey = cacheFetchRsp.data['private_key_d'];

    oThis.web3Instance.eth.accounts.wallet.add('0x9d9d5c2188cb8b64f9e43277f90e5a834dc7e06c77d67fda5bc66881a6f910cb');
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

module.exports = SignerWeb3;
