'use strict';
/**
 * This module grants eth to economy owner.
 *
 * @module lib/fund/ost/GrantOst
 */
const rootPrefix = '../../..',
  CoreAbis = require(rootPrefix + '/config/CoreAbis'),
  GrantOstBase = require(rootPrefix + '/lib/fund/ost/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  grantEthOstConstant = require(rootPrefix + '/lib/globalConstant/grant'),
  environmentConst = require(rootPrefix + '/lib/globalConstant/environmentInfo'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  AddressPrivateKeyCache = require(rootPrefix + '/lib/cacheManagement/shared/AddressPrivateKey'),
  gasPriceCacheKlass = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract');

/**
 * Class for granting ost.
 *
 * @class
 */
class GrantOst extends GrantOstBase {
  /**
   * Constructor for granting ost.
   *
   * @param {Object} params
   * @param {Integer} params.clientId
   * @param {Integer} params.originChainId
   * @param {String} params.address
   *
   * @augments GrantOstBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.pendingTransactionExtraData = params['pendingTransactionExtraData'];
    oThis.clientId = params.clientId;
    oThis.ownerAddress = params.address;
    oThis.originChainId = params.originChainId;
    oThis.senderPrivateKey = null;
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

    oThis._validate();

    await oThis._setWeb3Instance();

    await oThis._fetchOriginAddresses();

    await oThis._fetchSenderPrivateKey();

    let fundResponse = await oThis._fundAddress();

    if (fundResponse.isSuccess() && fundResponse.data.transactionHash) {
      return Promise.resolve(
        responseHelper.successWithData({
          transactionHash: fundResponse.data.transactionHash,
          taskStatus: workflowStepConstants.taskPending,
          taskResponseData: fundResponse.data.txOptions
        })
      );
    } else {
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone
      });
    }
  }

  /**
   * Run some validations.
   *
   * @return {*}
   *
   * @private
   */
  _validate() {
    if (
      !(coreConstants.environment === environmentConst.environment.production) &&
      !(coreConstants.subEnvironment === environmentConst.subEnvironment.mainnet)
    )
      logger.info('Non production Sandbox environment');
    else {
      return responseHelper.error({
        internal_error_identifier: 'l_f_e_ge_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: ''
      });
    }
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
          internal_error_identifier: 'l_f_e_ge_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.fromAddress = chainAddressesRsp.data[chainAddressConstants.originGranterKind].address;
    oThis.simpleTokenContractAddress = chainAddressesRsp.data[chainAddressConstants.stContractKind].address;
  }

  /**
   * Fetch sender private key.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fetchSenderPrivateKey() {
    const oThis = this;

    let addressPrivateKeyCache = new AddressPrivateKeyCache({ address: oThis.fromAddress }),
      cacheFetchRsp = await addressPrivateKeyCache.fetchDecryptedData();

    oThis.senderPrivateKey = cacheFetchRsp.data['private_key_d'];
  }

  /**
   * This function fetches origin chain gas price and sets in response data hash.
   *
   * @returns {Promise<*>}
   */
  async getOriginChainGasPrice() {
    const oThis = this;

    let gasPriceCacheObj = new gasPriceCacheKlass(),
      gasPriceRsp = await gasPriceCacheObj.fetch();

    return gasPriceRsp.data;
  }

  /**
   * Fund address
   *
   * @return {Promise<*>}
   *
   * @private
   */
  async _fundAddress() {
    const oThis = this;

    let senderAddress = oThis.originWeb3.eth.accounts.privateKeyToAccount(oThis.senderPrivateKey).address;

    logger.debug('Fetched Address from private key-----', senderAddress);

    let simpleTokenAbi = CoreAbis.simpleToken,
      simpleTokenContractObj = new oThis.originWeb3.eth.Contract(simpleTokenAbi, oThis.simpleTokenContractAddress),
      originChainGasPrice = await oThis.getOriginChainGasPrice();

    let encodedABI = simpleTokenContractObj.methods
        .transfer(oThis.ownerAddress, grantEthOstConstant.grantOstValue)
        .encodeABI(),
      ostTransferParams = {
        from: senderAddress,
        to: oThis.simpleTokenContractAddress,
        data: encodedABI,
        value: 0,
        gasPrice: originChainGasPrice,
        gas: contractConstants.transferOstGas
      };
    console.log('Balance  -----------  ', await simpleTokenContractObj.methods.balanceOf(senderAddress).call({}));

    let submitTxRsp = await new SubmitTransaction({
      chainId: oThis.originChainId,
      provider: oThis.originWsProviders[0],
      txOptions: ostTransferParams,
      options: oThis.pendingTransactionExtraData
    }).perform();

    submitTxRsp.data.txOptions = ostTransferParams;

    logger.debug('========= SubmitTxRsp from GrantOst ==========', submitTxRsp);

    logger.log('OST successfully funded to address ->', oThis.ownerAddress);

    //await oThis.originWeb3.eth.accounts.wallet.remove(oThis.senderPrivateKey);

    return submitTxRsp;
  }
}

module.exports = GrantOst;
