/**
 * Module to grant ERC20 token base class.
 *
 * @module lib/fund/erc20/Base
 */

const rootPrefix = '../../..',
  CoreAbis = require(rootPrefix + '/config/CoreAbis'),
  StakeCurrenciesModel = require(rootPrefix + '/app/models/mysql/StakeCurrency'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  DynamicGasPriceCache = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract');

/**
 * Base class to grant ERC20 token.
 *
 * @class Base
 */
class Base {
  /**
   * Constructor for base class to grant ERC20 token.
   *
   * @param {object} params
   * @param {string/number} params.originChainId
   * @param {string} params.tokenSymbol
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.originChainId = params.originChainId;
    oThis.tokenSymbol = params.tokenSymbol;

    oThis.tokenContractAddress = null;
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

    await oThis._setTokenContractAddress();

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
   * Fetch origin addresses
   *
   * @sets oThis.tokenContractAddress
   *
   * @return {Promise<void>}
   * @private
   */
  async _setTokenContractAddress() {
    const oThis = this,
      stakeCurrenciesModelObj = new StakeCurrenciesModel({});

    const stakeCurrenciesRsp = await stakeCurrenciesModelObj.fetchStakeCurrenciesBySymbols([oThis.tokenSymbol]);

    const currencyId = Object.keys(stakeCurrenciesRsp.data)[0];

    oThis.tokenContractAddress = stakeCurrenciesRsp.data[currencyId].contractAddress;
  }

  /**
   * Fund address with ERC20.
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
  async _fundAddressWithErc20(fromAddress, toAddress, amountInWei, options) {
    const oThis = this;

    const pendingTransactionExtraData = options.pendingTransactionExtraData,
      waitTillReceipt = options.waitTillReceipt || 0;

    const genericErc20 = CoreAbis.genericErc20,
      erc20ContractObj = new oThis.originWeb3.eth.Contract(genericErc20, oThis.tokenContractAddress);

    const encodedABI = erc20ContractObj.methods.transfer(toAddress, amountInWei).encodeABI();

    oThis.txOptions = {
      from: fromAddress,
      to: oThis.tokenContractAddress,
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
