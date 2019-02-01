'use strict';

/**
 *  @module lib/setup/economy/SetInternalActorForOwner
 *
 *  This class helps in setting owner address as internal actor
 */

const rootPrefix = '../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

const BrandedToken = require('@openstfoundation/brandedtoken.js'),
  ContractsHelper = BrandedToken.Contracts;

class SetInternalActorForOwnerInUBT {
  constructor(params) {
    const oThis = this;
    oThis.tokenId = params.tokenId;
    oThis.pendingTransactionExtraData = params['pendingTransactionExtraData'];
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
          internal_error_identifier: 't_es_siafo_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: { error: error.toString() }
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

    oThis.deployChainId = oThis._configStrategyObject.auxChainId;
    oThis.chainEndpoint = oThis._configStrategyObject.chainWsProvider(oThis.deployChainId, 'readWrite');

    await oThis._setAddresses();

    await oThis._setWeb3Instance();

    let submitTxRsp = await oThis._setInternalActorInUBT();

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskPending,
        transactionHash: submitTxRsp.data['transactionHash'],
        taskResponseData: {
          gasPrice: contractConstants.auxChainGasPrice,
          from: oThis.workerAddress,
          chainEndPoint: oThis.chainEndPoint,
          ownerAddress: oThis.ownerAddress,
          utilityBTContractAddress: oThis.utilityBTContractAddress
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

    oThis.ownerAddress = getAddrRsp.data[tokenAddressConstants.ownerAddressKind];
    oThis.workerAddress = getAddrRsp.data[tokenAddressConstants.auxWorkerAddressKind][0];
    oThis.utilityBTContractAddress = getAddrRsp.data[tokenAddressConstants.utilityBrandedTokenContract];

    if (!oThis.workerAddress || !oThis.ownerAddress || !oThis.utilityBTContractAddress) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_es_siafo_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            workerAddress: oThis.workerAddress,
            ownerAddress: oThis.ownerAddress,
            utilityBTContractAddress: oThis.utilityBTContractAddress
          }
        })
      );
    }
  }

  /**
   * _setWeb3Instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;
    oThis.web3Instance = web3Provider.getInstance(oThis.chainEndpoint).web3WsProvider;
  }

  /**
   * _setInternalActorInUBT
   *
   * @return {Promise<void>}
   * @private
   */
  async _setInternalActorInUBT() {
    const oThis = this;

    let contractsHelper = new ContractsHelper(null, oThis.web3Instance);

    let txOptions = {
      from: oThis.workerAddress,
      to: oThis.utilityBTContractAddress,
      gasPrice: contractConstants.auxChainGasPrice,
      gas: contractConstants.setInternalActorInUBTGas,
      value: contractConstants.zeroValue
    };

    let ubtInstance = contractsHelper.UtilityBrandedToken(oThis.utilityBTContractAddress, txOptions);

    let txObject = ubtInstance.methods.registerInternalActor([oThis.ownerAddress]);

    txOptions['data'] = txObject.encodeABI();

    let submitTxRsp = await new SubmitTransaction({
      chainId: oThis.deployChainId,
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

InstanceComposer.registerAsShadowableClass(
  SetInternalActorForOwnerInUBT,
  coreConstants.icNameSpace,
  'SetInternalActorForOwnerInUBT'
);

module.exports = SetInternalActorForOwnerInUBT;
