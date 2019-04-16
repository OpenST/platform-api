/**
 * Module to grant ost base class.
 *
 * @module lib/fund/ost/Base
 */

const rootPrefix = '../../..',
  CoreAbis = require(rootPrefix + '/config/CoreAbis'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  DynamicGasPriceCache = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');

/**
 * Base class to grant ost.
 *
 * @class Base
 */
class Base {
  /**
   * Constructor for base class to grant ost.
   *
   * @param {object} params
   * @param {string/number} params.originChainId
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.originChainId = params.originChainId;

    oThis.simpleTokenContractAddress = null;
    oThis.originGasPrice = null;
    oThis.txOptions = null;
    oThis.originWsProviders = null;
    oThis.originWeb3 = null;
  }

  /**
   * Perform.
   *
   * @return {Promise|*|Promise<T>}
   */
  async perform() {
    const oThis = this;

    await oThis._setWeb3Instance();

    await oThis._setOriginChainGasPrice();

    await oThis._setSimpleTokenContractAddress();

    return oThis._performTransfers();
  }

  /**
   * Set Web3 Instance.
   *
   * @sets oThis.originWsProviders, oThis.originWeb3
   *
   * @return {Promise<void>}
   */
  async _setWeb3Instance() {
    const oThis = this;

    const response = await chainConfigProvider.getFor([oThis.originChainId]),
      originChainConfig = response[oThis.originChainId];

    oThis.originWsProviders = originChainConfig.originGeth.readWrite.wsProviders;

    const shuffledProviders = basicHelper.shuffleArray(oThis.originWsProviders);

    oThis.originWeb3 = web3Provider.getInstance(shuffledProviders[0]).web3WsProvider;
  }

  /**
   * Get origin chain gas price.
   *
   * @sets oThis.originGasPrice
   *
   * @return {Promise<*>}
   * @private
   */
  async _setOriginChainGasPrice() {
    const oThis = this;

    const dynamicGasPriceResponse = await new DynamicGasPriceCache().fetch();

    oThis.originGasPrice = dynamicGasPriceResponse.data;
  }

  /**
   * Fetch origin addresses.
   *
   * @sets oThis.simpleTokenContractAddress
   *
   * @return {Promise<void>}
   * @private
   */
  async _setSimpleTokenContractAddress() {
    const oThis = this;

    // Fetch all addresses associated with origin chain id.
    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_f_e_ge_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.simpleTokenContractAddress = chainAddressesRsp.data[chainAddressConstants.stContractKind].address;
  }

  /**
   * Fund address with OST.
   *
   * @param {string} fromAddress
   * @param {string} toAddress
   * @param {string} amountInWei
   * @param {string} options
   *
   * @sets oThis.txOptions
   *
   * @return {Promise<*>}
   * @private
   */
  async _fundAddressWithOst(fromAddress, toAddress, amountInWei, options) {
    const oThis = this;

    const pendingTransactionExtraData = options.pendingTransactionExtraData,
      waitTillReceipt = options.waitTillReceipt || 0;

    const simpleTokenAbi = CoreAbis.simpleToken,
      simpleTokenContractObj = new oThis.originWeb3.eth.Contract(simpleTokenAbi, oThis.simpleTokenContractAddress);

    const encodedABI = simpleTokenContractObj.methods.transfer(toAddress, amountInWei).encodeABI();

    oThis.txOptions = {
      from: fromAddress,
      to: oThis.simpleTokenContractAddress,
      data: encodedABI,
      value: 0,
      gasPrice: oThis.originGasPrice,
      gas: contractConstants.transferOstGas
    };

    const submitTxParams = {
      chainId: oThis.originChainId,
      web3Instance: oThis.originWeb3,
      txOptions: oThis.txOptions,
      waitTillReceipt: waitTillReceipt
    };

    if (options.pendingTransactionKind) {
      submitTxParams.pendingTransactionKind = options.pendingTransactionKind;
    }

    if (options.tokenId) {
      submitTxParams.tokenId = options.tokenId;
    }

    if (pendingTransactionExtraData) {
      submitTxParams.options = pendingTransactionExtraData;
    }

    return new SubmitTransaction(submitTxParams).perform();
  }

  /**
   * Perform transfer.
   *
   * @return {Promise<*>}
   * @private
   */
  _performTransfers() {
    throw new Error('Sub-class to implement.');
  }
}

module.exports = Base;
