'use strict';
/**
 *
 * Grant ost base class.
 *
 * @module lib/fund/eth/Base
 */
const rootPrefix = '../../..',
  CoreAbis = require(rootPrefix + '/config/CoreAbis'),
  NonceManager = require(rootPrefix + '/lib/nonce/Manager'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  grantEthOstConstant = require(rootPrefix + '/lib/globalConstant/grant'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig');

class Base {
  /**
   * @constructor
   *
   * @param params
   * @param params.auxChainId      {Number}
   * @param params.originChainId   {Number}
   */
  constructor(params) {
    const oThis = this;

    oThis.originChainId = params.originChainId;

    oThis.fromAddress = null;
    oThis.toAddress = null;
    oThis.senderPrivateKey = null;
    oThis.gas = null;
    oThis.gasPrice = null;
  }

  /**
   * perform
   *
   * @return {Promise|*|Promise<T>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error(`${__filename}::perform::catch`);
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'l_f_o_b_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * _asyncPerform
   *
   * @return {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._setWeb3Instance();

    await oThis._fetchSenderPrivateKey();

    await oThis._fundAddress();
  }

  /**
   * set Web3 Instance
   *
   * @return {Promise<void>}
   */
  async _setWeb3Instance() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.originChainId]);

    oThis.originChainConfig = response[oThis.originChainId];
    oThis.originWsProviders = oThis.originChainConfig.originGeth.readWrite.wsProviders;
    oThis.originWeb3 = web3Provider.getInstance(oThis.originWsProviders[0]).web3WsProvider;
  }

  /**
   * Fund address
   *
   * @return {Promise<*>}
   * @private
   */
  async _fundAddress(toAddress) {
    const oThis = this;

    await oThis.originWeb3.eth.accounts.wallet.add(oThis.senderPrivateKey);

    let senderAddress = oThis.originWeb3.eth.accounts.privateKeyToAccount(oThis.senderPrivateKey).address;

    logger.debug('Fetched Address from private key-----', senderAddress);

    let simpleTokenAbi = CoreAbis.simpleToken,
      simpleTokenContractObj = new oThis.originWeb3.eth.Contract(simpleTokenAbi, toAddress);

    let nonce = await oThis._fetchNonce(senderAddress, oThis.originChainId);

    let encodedABI = simpleTokenContractObj.methods
        .transfer(toAddress, grantEthOstConstant.grantOstValue.toString(10))
        .encodeABI(),
      ostTransferParams = {
        from: senderAddress,
        to: toAddress,
        data: encodedABI,
        nonce: nonce,
        gas: 60000
      };

    await oThis.originWeb3.eth
      .sendTransaction(ostTransferParams)
      .then(function(response) {
        logger.log('** OST successfully funded to address -> ', toAddress);
        return Promise.resolve();
      })
      .catch(function(error) {
        logger.error(error);
        return Promise.reject();
      });

    await oThis.originWeb3.eth.accounts.wallet.remove(oThis.senderPrivateKey);
  }

  /**
   * Fetch Nonce of organization owner
   *
   * @return {Object}
   */
  async _fetchNonce(address, chainId) {
    let resp = await new NonceManager({
      address: address,
      chainId: chainId
    }).getNonce();

    if (resp.isSuccess()) {
      return resp.data.nonce;
    }
  }

  /**
   * Fetch recipient address
   *
   * @private
   */
  _fetchSenderPrivateKey() {
    throw 'sub-class to implement';
  }
}

module.exports = Base;
