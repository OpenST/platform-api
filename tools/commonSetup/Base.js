'use strict';

/**
 * Base klass for setup tasks that are common across origin & aux chains
 *
 * @module tools/commonSetup/Base
 */
const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  NonceManager = require(rootPrefix + '/lib/nonce/Manager'),
  AddressPrivateKeyCache = require(rootPrefix + '/lib/sharedCacheManagement/AddressPrivateKey'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  web3Provider = require(rootPrefix + '/lib/providers/web3');

/**
 *
 * @class
 */
class CommonSetupBase {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Number} params.chainId - chain id on which this is to be performed
   * @param {String} params.signerAddress - address who signs Tx
   * @param {String} params.chainEndpoint - url to connect to chain
   * @param {String} params.gasPrice -  gas price to use
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.chainId = params['chainId'];
    oThis.chainEndpoint = params['chainEndpoint'];
    oThis.signerAddress = params['signerAddress'];
    oThis.gasPrice = params['gasPrice'];

    oThis.web3InstanceObj = null;
  }

  /**
   *
   * Perform
   *
   * @return {Promise<result>}
   *
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('tools/commonSetup/Base::perform::catch');
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 't_cos_b_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /***
   *
   * get web3instance to interact with chain
   *
   * @return {Object}
   */
  get _web3Instance() {
    const oThis = this;
    if (oThis.web3InstanceObj) return oThis.web3InstanceObj;
    oThis.web3InstanceObj = web3Provider.getInstance(oThis.chainEndpoint).web3WsProvider;
    return oThis.web3InstanceObj;
  }

  /***
   *
   * get prive key of signer from cache
   *
   * @return {String}
   */
  async _fetchSignerKey() {
    const oThis = this,
      addressPrivateKeyCache = new AddressPrivateKeyCache({ address: oThis.signerAddress }),
      cacheFetchRsp = await addressPrivateKeyCache.fetchDecryptedData();
    return cacheFetchRsp.data['private_key_d'];
  }

  /***
   *
   * add key to web3 wallet
   *
   * @param {String} signerKey
   *
   * @private
   */
  _addKeyToWallet(signerKey) {
    const oThis = this;
    oThis._web3Instance.eth.accounts.wallet.add(signerKey);
  }

  /***
   *
   * remove key from web3 wallet
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
   * fetch nonce (calling this method means incrementing nonce in cache, use judiciouly)
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

module.exports = CommonSetupBase;
