/**
 * Module to transfer OST using private key.
 *
 * @module lib/fund/erc20/TransferUsingPK
 */

const rootPrefix = '../../..',
  CoreAbis = require(rootPrefix + '/config/CoreAbis'),
  NonceGetForTransaction = require(rootPrefix + '/lib/nonce/get/ForTransaction'),
  DynamicGasPriceCache = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract');

/**
 * Class to transfer OST using private key.
 *
 * @class TransferOstUsingPK
 */
class TransferOstUsingPK {
  /**
   * Constructor to transfer OST using private key.
   *
   * @param {object} params
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
    oThis.tokenContractAddress = null;
  }

  /**
   * Perform.
   *
   * @return {Promise|*|Promise<T>}
   */
  async perform() {
    const oThis = this;

    await oThis._setOriginChainGasPrice();

    await oThis._setTokenContractAddress();

    return oThis._fundAddressWithErc20UsingPk();
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
   * @return {Promise<void>}
   *
   * @private
   */
  async _setTokenContractAddress() {
    const oThis = this,
      stakeCurrenciesModelObj = new StakeCurrenciesModel({});

    let stakeCurrenciesRsp = await stakeCurrenciesModelObj.fetchStakeCurrenciesBySymbols([oThis.tokenSymbol]);

    let currency_id = Object.keys(stakeCurrenciesRsp.data)[0];

    oThis.tokenContractAddress = stakeCurrenciesRsp.data[currency_id].contractAddress;
  }

  /**
   * Fund address with OST using private key.
   *
   * @return {Promise<void>}
   * @private
   */
  async _fundAddressWithErc20UsingPk() {
    const oThis = this;

    const web3Instance = await web3Provider.getInstance(oThis.provider).web3WsProvider;

    await web3Instance.eth.accounts.wallet.add(oThis.fromAddressPrivateKey);

    const senderAddress = web3Instance.eth.accounts.privateKeyToAccount(oThis.fromAddressPrivateKey).address;

    const nonce = await oThis._fetchNonce(senderAddress, oThis.originChainId);

    const erc20Abi = CoreAbis.genericErc20,
      erc20ContractObj = new web3Instance.eth.Contract(erc20Abi, oThis.tokenContractAddress);

    const encodedABI = erc20ContractObj.methods.transfer(oThis.toAddress, oThis.amountInWei).encodeABI();

    const txParams = {
      from: senderAddress,
      to: oThis.tokenContractAddress,
      data: encodedABI,
      value: 0,
      gasPrice: oThis.originGasPrice,
      gas: contractConstants.transferOstGas,
      nonce: nonce
    };

    logger.debug('Ost transfer using private key transaction params: ', txParams);

    const txReceipt = await web3Instance.eth
      .sendTransaction(txParams)
      .then(function(response) {
        logger.log('** OST successfully funded to address -> ', oThis.toAddress);

        return Promise.resolve(response);
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
   * Fetch Nonce of organization owner.
   *
   * @return {Object}
   */
  async _fetchNonce(address, chainId) {
    const resp = await new NonceGetForTransaction({
      address: address,
      chainId: chainId
    }).getNonce();

    if (resp.isSuccess()) {
      return resp.data.nonce;
    }
  }
}

module.exports = TransferOstUsingPK;
