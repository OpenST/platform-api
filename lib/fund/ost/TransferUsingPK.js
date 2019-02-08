'use strict';

/**
 * Transfer OST using Private Key
 *
 * @module lib/fund/ost/TransferUsingPK
 */
const rootPrefix = '../../..',
  CoreAbis = require(rootPrefix + '/config/CoreAbis'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  DynamicGasPriceCache = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  NonceManager = require(rootPrefix + '/lib/nonce/Manager');

/**
 * Class to transfer OST using Private Key
 *
 * @class
 */
class TransferOstUsingPK {
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
    oThis.simpleTokenContractAddress = null;
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
          internal_error_identifier: 'l_f_o_tupk_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * Async perform
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._setOriginChainGasPrice();

    await oThis._fetchOriginAddresses();

    return oThis._fundAddressWithOstUsingPk();
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
   * Fetch origin addresses
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fetchOriginAddresses() {
    const oThis = this;

    // Fetch all addresses associated with origin chain id.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_f_o_tuk_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.simpleTokenContractAddress = chainAddressesRsp.data[chainAddressConstants.stContractKind].address;
  }

  /**
   * Fund address with OST using Private Key
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fundAddressWithOstUsingPk() {
    const oThis = this;

    let web3Instance = await web3Provider.getInstance(oThis.provider).web3WsProvider;

    await web3Instance.eth.accounts.wallet.add(oThis.fromAddressPrivateKey);

    let senderAddress = web3Instance.eth.accounts.privateKeyToAccount(oThis.fromAddressPrivateKey).address;

    let nonce = await oThis._fetchNonce(senderAddress, oThis.originChainId);

    let simpleTokenAbi = CoreAbis.simpleToken,
      simpleTokenContractObj = new oThis.originWeb3.eth.Contract(simpleTokenAbi, oThis.simpleTokenContractAddress);

    let encodedABI = simpleTokenContractObj.methods.transfer(oThis.toAddress, oThis.amountInWei).encodeABI();

    let txParams = {
      from: senderAddress,
      to: oThis.simpleTokenContractAddress,
      data: encodedABI,
      value: 0,
      gasPrice: oThis.originGasPrice,
      gas: contractConstants.transferOstGas,
      nounce: nonce
    };

    logger.debug('Ost transfer using private key transaction params: ', txParams);

    let txReceipt = await web3Instance.eth
      .sendTransaction(txParams)
      .then(function(response) {
        logger.log('** OST successfully funded to address -> ', response.to);
        return Promise.resolve();
      })
      .catch(function(error) {
        logger.error(error);
        return Promise.reject();
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
    let resp = await new NonceManager({
      address: address,
      chainId: chainId
    }).getNonce();

    if (resp.isSuccess()) {
      return resp.data.nonce;
    }
  }
}

module.exports = TransferOstUsingPK;
