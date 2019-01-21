'use strict';
/**
 * Base class for setup tasks that are common across origin & aux chains
 *
 * @module /tools/chainSetup/mosaicInteracts/Base
 */
const rootPrefix = '../../..',
  NonceManager = require(rootPrefix + '/lib/nonce/Manager'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  AddressPrivateKeyCache = require(rootPrefix + '/lib/sharedCacheManagement/AddressPrivateKey');

/**
 * Class for setup tasks that are common across origin & aux chains
 *
 * @class
 */
class Base {
  /**
   * Constructor for setup tasks that are common across origin & aux chains
   *
   * @param {Object} params
   * @param {Number} params.chainId: chain id on which this is to be performed
   * @param {Number} params.remoteChainId: pass auxChainId, for anchor contract deployment
   * @param {String} params.signerAddress: address who signs Tx
   * @param {String} params.chainEndpoint: url to connect to chain
   * @param {String} params.gasPrice: gas price to use
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.chainId = params['chainId'];
    oThis.remoteChainId = params['remoteChainId'];
    oThis.chainEndpoint = params['chainEndpoint'];
    oThis.signerAddress = params['signerAddress'];
    oThis.gasPrice = params['gasPrice'];

    oThis.web3InstanceObj = null;
  }

  /**
   * Performer
   *
   * @return {Promise<result>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('tools/chainSetup/mosaicInteracts/Base::perform::catch');
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 't_cs_mi_b_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * Get web3instance to interact with chain
   *
   * @return {Object}
   */
  get _web3Instance() {
    const oThis = this;

    if (oThis.web3InstanceObj) return oThis.web3InstanceObj;

    oThis.web3InstanceObj = web3Provider.getInstance(oThis.chainEndpoint).web3WsProvider;

    return oThis.web3InstanceObj;
  }

  /**
   * Get private key of signer from cache
   *
   * @return {String}
   */
  async _fetchSignerKey() {
    const oThis = this,
      addressPrivateKeyCache = new AddressPrivateKeyCache({ address: oThis.signerAddress }),
      cacheFetchRsp = await addressPrivateKeyCache.fetchDecryptedData();

    return cacheFetchRsp.data['private_key_d'];
  }

  /**
   * Add key to web3 wallet
   *
   * @param {String} signerKey
   *
   * @private
   */
  // TODO :: clean up using signer web3
  _addKeyToWallet(signerKey) {
    const oThis = this;

    oThis._web3Instance.eth.accounts.wallet.add(signerKey);
  }

  /**
   * Remove key from web3 wallet
   *
   * @param {String} signerKey
   *
   * @private
   */
  _removeKeyFromWallet(signerKey) {
    const oThis = this;

    oThis._web3Instance.eth.accounts.wallet.remove(signerKey);
  }

  /**
   * Fetch nonce (calling this method means incrementing nonce in cache, use judiciously)
   *
   * @ignore
   *
   * @return {Promise}
   */
  async _fetchNonce() {
    const oThis = this;

    return new NonceManager({
      address: oThis.signerAddress,
      chainId: oThis.chainId
    }).getNonce();
  }
}

module.exports = Base;
