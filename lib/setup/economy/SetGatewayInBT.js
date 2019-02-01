'use strict';
/**
 * This class helps in setting gateway in BT contract
 *
 * @module lib/setup/economy/SetGatewayInBT
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  gasPriceCacheKlass = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice');

const BrandedToken = require('@openstfoundation/brandedtoken.js'),
  brandedTokenHelper = BrandedToken.EconomySetup.BrandedTokenHelper;

class SetGatewayInBT {
  constructor(params) {
    const oThis = this;

    oThis.originChainId = oThis._configStrategyObject.originChainId;

    oThis.tokenId = params.tokenId;
    oThis.pendingTransactionExtraData = params['pendingTransactionExtraData'];

    oThis.chainEndPoint = null;
    oThis.brandedTokenContractAddress = null;
    oThis.simpleStakeAddress = null;
    oThis.tokenGatewayAddress = null;
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

    await oThis._initializeVars();

    await oThis._setAddresses();

    let submitTxRsp = await oThis._setGatewayInBT();

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskPending,
        transactionHash: submitTxRsp.data['transactionHash'],
        taskResponseData: {
          gasPrice: oThis.gasPrice,
          from: oThis.workerAddress,
          chainEndPoint: oThis.chainEndPoint,
          tokenGatewayAddress: oThis.tokenGatewayAddress,
          simpleStakeAddress: oThis.simpleStakeAddress,
          brandedTokenContractAddress: oThis.brandedTokenContractAddress
        }
      })
    );
  }

  /***
   *
   * init vars
   *
   * @private
   */
  async _initializeVars() {
    const oThis = this;
    oThis.deployChainId = oThis._configStrategyObject.originChainId;
    oThis.chainEndpoint = oThis._configStrategyObject.chainWsProvider(oThis.deployChainId, 'readWrite');
    let gasPriceCacheObj = new gasPriceCacheKlass(),
      gasPriceRsp = await gasPriceCacheObj.fetch();
    oThis.gasPrice = gasPriceRsp.data;
    oThis.web3Instance = await web3Provider.getInstance(oThis.chainEndpoint).web3WsProvider;
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

    oThis.workerAddress = getAddrRsp.data[tokenAddressConstants.originWorkerAddressKind][0];
    oThis.tokenGatewayAddress = getAddrRsp.data[tokenAddressConstants.tokenGatewayContract];
    oThis.simpleStakeAddress = getAddrRsp.data[tokenAddressConstants.simpleStakeContract];
    oThis.brandedTokenContractAddress = getAddrRsp.data[tokenAddressConstants.brandedTokenContract];

    if (
      !oThis.workerAddress ||
      !oThis.tokenGatewayAddress ||
      !oThis.simpleStakeAddress ||
      !oThis.brandedTokenContractAddress
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_es_sgbt_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            workerAddress: oThis.workerAddress,
            tokenGatewayAddress: oThis.tokenGatewayAddress,
            simpleStakeAddress: oThis.simpleStakeAddress,
            brandedTokenContractAddress: oThis.brandedTokenContractAddress
          }
        })
      );
    }
  }

  /**
   * _setGatewayInBT
   *
   * @return {Promise<void>}
   * @private
   */
  async _setGatewayInBT() {
    const oThis = this;

    let brandedTokenHelperObj = new brandedTokenHelper();

    let txOptions = {
      gasPrice: oThis.gasPrice,
      from: oThis.workerAddress,
      to: oThis.brandedTokenContractAddress,
      gas: contractConstants.setGatewayInBTGas,
      value: contractConstants.zeroValue
    };

    let txObject = brandedTokenHelperObj._liftRestrictionRawTx(
      [oThis.tokenGatewayAddress, oThis.simpleStakeAddress],
      oThis.workerAddress,
      txOptions,
      oThis.brandedTokenContractAddress,
      oThis.web3Instance
    );

    txOptions['data'] = txObject.encodeABI();

    let submitTxRsp = await new SubmitTransaction({
      chainId: oThis.originChainId,
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
