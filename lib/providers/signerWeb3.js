'use strict';
/**
 * Web3 WS provider with signer key to submit transaction
 *
 * @module lib/providers/signerWeb3
 */

const rootPrefix = '../..',
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  AddressPrivateKeyCache = require(rootPrefix + '/lib/cacheManagement/shared/AddressPrivateKey');

/**
 * Class for signer web3.
 *
 * @class
 */
class SignerWeb3 {
  /**
   * Constructor for signer web3.
   *
   * @param provider {String}: URL of the node
   * @param address {String} (Optional): Address whose private key needs to be added.
   *
   * @constructor
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

module.exports = SignerWeb3;
