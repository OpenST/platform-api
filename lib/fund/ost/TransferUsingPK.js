/**
 * Module to transfer OST using private key.
 *
 * @module lib/fund/ost/TransferUsingPK
 */

const rootPrefix = '../../..',
  CoreAbis = require(rootPrefix + '/config/CoreAbis'),
  NonceGetForTransaction = require(rootPrefix + '/lib/nonce/get/ForTransaction'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  DynamicGasPriceCache = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');

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
    oThis.simpleTokenContractAddress = null;
  }

  /**
   * Perform.
   *
   * @return {Promise|*|Promise<T>}
   */
  async perform() {
    const oThis = this;

    await oThis._setOriginChainGasPrice();

    await oThis._fetchOriginAddresses();

    return oThis._fundAddressWithOstUsingPk();
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
  async _fetchOriginAddresses() {
    const oThis = this;

    // Fetch all addresses associated with origin chain id.
    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
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
   * Fund address with OST using private key.
   *
   * @return {Promise<void>}
   * @private
   */
  async _fundAddressWithOstUsingPk() {
    const oThis = this;

    const web3Instance = await web3Provider.getInstance(oThis.provider).web3WsProvider;

    await web3Instance.eth.accounts.wallet.add(oThis.fromAddressPrivateKey);

    const senderAddress = web3Instance.eth.accounts.privateKeyToAccount(oThis.fromAddressPrivateKey).address;

    const nonce = await oThis._fetchNonce(senderAddress, oThis.originChainId);

    const simpleTokenAbi = CoreAbis.simpleToken,
      simpleTokenContractObj = new web3Instance.eth.Contract(simpleTokenAbi, oThis.simpleTokenContractAddress);

    const encodedABI = simpleTokenContractObj.methods.transfer(oThis.toAddress, oThis.amountInWei).encodeABI();

    const txParams = {
      from: senderAddress,
      to: oThis.simpleTokenContractAddress,
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
