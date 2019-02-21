'use strict';

/**
 * Transfer ETH using Private Key
 *
 * @module lib/fund/eth/TransferUsingPK
 */
const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  NonceGetForTransaction = require(rootPrefix + '/lib/nonce/get/ForTransaction'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  DynamicGasPriceCache = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice');

/**
 * Class to transfer ETH using Private Key
 *
 * @class
 */
class TransferEthUsingPK {
  /**
   * Constructor
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.toAddress = params.toAddress;
    oThis.fromAddressPrivateKey = params.fromAddressPrivateKey;
    oThis.amountInWei = params.amountInWei;
    oThis.originChainId = params.originChainId;
    oThis.provider = params.provider;

    oThis.originGasPrice = null;
  }

  /**
   * Async perform
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async perform() {
    const oThis = this;

    await oThis._setOriginChainGasPrice();

    return oThis._fundAddressWithEthUsingPk();
  }

  /**
   * Get origin chain gas price
   *
   * @return {Promise<*>}
   * @private
   */
  async _setOriginChainGasPrice() {
    const oThis = this;

    let dynamicGasPriceResponse = await new DynamicGasPriceCache().fetch();

    oThis.originGasPrice = dynamicGasPriceResponse.data;
  }

  /**
   * Fund address with ETH using Private Key
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fundAddressWithEthUsingPk() {
    const oThis = this;

    let web3Instance = await web3Provider.getInstance(oThis.provider).web3WsProvider;

    await web3Instance.eth.accounts.wallet.add(oThis.fromAddressPrivateKey);

    let senderAddress = web3Instance.eth.accounts.privateKeyToAccount(oThis.fromAddressPrivateKey).address;

    let nonce = await oThis._fetchNonce(senderAddress, oThis.originChainId);

    let txParams = {
      from: senderAddress,
      gas: contractConstants.transferEthGas,
      to: oThis.toAddress,
      nonce: nonce,
      value: oThis.amountInWei,
      gasPrice: oThis.originGasPrice
    };

    logger.debug('Eth transfer using private key transaction params: ', txParams);

    let txReceipt = await web3Instance.eth
      .sendTransaction(txParams)
      .then(function(response) {
        logger.log('** ETH successfully funded to address -> ', response.to);
        return response;
      })
      .catch(function(error) {
        logger.error(error);
        return Promise.reject(error);
      });

    await web3Instance.eth.accounts.wallet.remove(oThis.fromAddressPrivateKey);

    return responseHelper.successWithData({
      transactionHash: txReceipt.transactionHash,
      txOptions: txParams
    });
  }

  /**
   * Fetch Nonce of organization owner
   *
   * @return {Object}
   */
  async _fetchNonce(address, chainId) {
    const oThis = this;
    let resp = await new NonceGetForTransaction({
      address: address,
      chainId: chainId
    }).getNonce();

    if (resp.isSuccess()) {
      return resp.data.nonce;
    }
  }
}

module.exports = TransferEthUsingPK;
