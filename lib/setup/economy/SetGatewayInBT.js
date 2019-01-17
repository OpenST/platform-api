'use strict';

/**
 *  @module lib/setup/economy/SetGatewayInBT
 *
 *  This class helps in setting gateway in BT contract
 */

const rootPrefix = '../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  TokenAddressCache = require(rootPrefix + '/lib/sharedCacheManagement/TokenAddress'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  transferAmount = require(rootPrefix + '/tools/helpers/TransferAmountOnChain'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  gasPriceCacheKlass = require(rootPrefix + '/lib/sharedCacheManagement/EstimateOriginChainGasPrice');

const BrandedToken = require('@openstfoundation/branded-token.js'),
  brandedTokenHelper = BrandedToken.EconomySetup.BrandedTokenHelper;

class SetGatewayInBT {
  constructor(params) {
    const oThis = this;

    oThis.originChainId = oThis._configStrategyObject.originChainId;
    oThis.tokenId = params.tokenId;

    oThis.chainEndPoint = null;
    oThis.brandedTokenContractAddress = null;
    oThis.simpleStakeAddress = null;
    oThis.tokenGatewayAddress = null;
    oThis.tokenCoGatewayAddresses = null;
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
          internal_error_identifier: 't_es_sgbt_1',
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

    await oThis._setAddresses();

    await oThis._setWeb3Instance();

    await oThis._fundAddress(oThis.workerAddress);

    await oThis._fetchAndSetGasPrice();

    let submitTxRsp = await oThis._setGatewayInBT();

    return Promise.resolve(
      responseHelper.successWithData({
        taskDone: 0,
        transactionHash: submitTxRsp.data['transactionHash'],
        taskResponseData: {
          gasPrice: oThis.gasPrice,
          from: oThis.workerAddress,
          chainEndPoint: oThis.chainEndPoint,
          workerAddress: oThis.workerAddress,
          tokenCoGatewayAddresses: oThis.tokenCoGatewayAddresses,
          tokenGatewayAddress: oThis.tokenGatewayAddress,
          simpleStakeAddress: oThis.simpleStakeAddress,
          brandedTokenContractAddress: oThis.brandedTokenContractAddress
        }
      })
    );
  }

  /***
   *
   * @private
   */
  async _setAddresses() {
    const oThis = this;

    let getAddrRsp = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    oThis.workerAddress = getAddrRsp.data[tokenAddressConstants.workerAddressKind][0];
    oThis.tokenGatewayAddress = getAddrRsp.data[tokenAddressConstants.tokenGatewayContract];
    oThis.simpleStakeAddress = getAddrRsp.data[tokenAddressConstants.simpleStakeContract];
    oThis.tokenCoGatewayAddresses = getAddrRsp.data[tokenAddressConstants.tokenCoGatewayContract];
    oThis.brandedTokenContractAddress = getAddrRsp.data[tokenAddressConstants.brandedTokenContract];

    if (
      !oThis.workerAddress ||
      !oThis.tokenGatewayAddress ||
      !oThis.tokenCoGatewayAddresses ||
      !oThis.simpleStakeAddress ||
      !oThis.brandedTokenContractAddress
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_es_sgbt_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            workerAddress: oThis.workerAddress,
            tokenCoGatewayAddresses: oThis.tokenCoGatewayAddresses,
            tokenGatewayAddress: oThis.tokenGatewayAddress,
            simpleStakeAddress: oThis.simpleStakeAddress,
            brandedTokenContractAddress: oThis.brandedTokenContractAddress
          }
        })
      );
    }
  }

  /**
   * This functions fetches and sets the gas price according to the chain kind passed to it.
   * @returns {Promise<void>}
   * @private
   */
  async _fetchAndSetGasPrice() {
    const oThis = this;

    let gasPriceCacheObj = new gasPriceCacheKlass(),
      gasPriceRsp = await gasPriceCacheObj.fetch();

    oThis.gasPrice = gasPriceRsp.data;
  }

  async _fundAddress(address) {
    const oThis = this;

    let amountInWei = '100000000000000000000';
    await transferAmount._fundAddressWithEth(address, oThis.originChainId, oThis.web3Instance, amountInWei);

    logger.info('Gas transferred to Organization worker address: ', address);
  }

  /**
   * _setWeb3Instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;
    oThis.chainEndPoint = oThis._configStrategyObject.chainWsProvider(oThis.originChainId, 'readWrite');
    oThis.web3Instance = web3Provider.getInstance(oThis.chainEndpoint).web3WsProvider;
  }

  /**
   * _setGatewayInBT
   *
   * @return {Promise<void>}
   * @private
   */
  async _setGatewayInBT() {
    const oThis = this;

    let brandedTokenHelperObj = new brandedTokenHelper(oThis.web3Instance, oThis.brandedTokenContractAddress);

    let txOptions = {
      gasPrice: oThis.gasPrice,
      from: oThis.workerAddress,
      gas: contractConstants.setGatewayInBTGas,
      value: contractConstants.zeroValue
    };

    let txObject = brandedTokenHelperObj._liftRestrictionRawTx(
      [oThis.gatewayContractAddress, oThis.simpleStakeAddress],
      oThis.workerAddress,
      txOptions,
      oThis.brandedTokenContractAddress,
      oThis.web3Instance
    );

    txOptions['data'] = txObject.encodeABI();

    let submitTxRsp = await new SubmitTransaction({
      chainId: oThis.chainId,
      provider: oThis.chainEndpoint,
      txOptions: txOptions,
      options: oThis.pendingTransactionExtraData
    }).perform();

    return Promise.resolve(submitTxRsp);
  }

  /***
   *
   * config strategy
   *
   * @return {object}
   */
  get _configStrategy() {
    const oThis = this;
    return oThis.ic().configStrategy;
  }

  /***
   *
   * object of config strategy klass
   *
   * @return {object}
   */
  get _configStrategyObject() {
    const oThis = this;
    if (oThis.configStrategyObj) return oThis.configStrategyObj;
    oThis.configStrategyObj = new ConfigStrategyObject(oThis._configStrategy);
    return oThis.configStrategyObj;
  }
}
InstanceComposer.registerAsShadowableClass(SetGatewayInBT, coreConstants.icNameSpace, 'SetGatewayInBT');
module.exports = SetGatewayInBT;
