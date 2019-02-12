'use strict';

/**
 *  @module lib/setup/economy/SetInternalActorForCompanyTokenHolderInUBT
 */

const rootPrefix = '../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  SetInternalActorInUBT = require(rootPrefix + '/lib/setup/common/SetInternalActorInUBT'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

class SetInternalActorForCompanyTokenHolderInUBT {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {String} params.tokenId: tokenId
   * @param {Integer} params.auxChainId - chainId
   * @param {String} params.tokenCompanyTokenHolderAddress: token holder of company
   * @param {String} params.pendingTransactionExtraData: extraData for pending transaction.
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;
    oThis.tokenId = params.tokenId;
    oThis.auxChainId = params.auxChainId;
    oThis.tokenCompanyTokenHolderAddress = params.tokenCompanyTokenHolderAddress;
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
          internal_error_identifier: 't_es_siafcthibut_1',
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

    await oThis._initializeVars();

    await oThis._validateMandatoryParams();

    await oThis._setAddresses();

    let submitTxRsp = await oThis._setInternalActorInUBT();

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskPending,
        transactionHash: submitTxRsp.data['transactionHash'],
        taskResponseData: {
          from: oThis.workerAddress,
          chainEndpoint: oThis.chainEndpoint,
          tokenCompanyTokenHolderAddress: oThis.tokenCompanyTokenHolderAddress,
          utilityBTContractAddress: oThis.utilityBTContractAddress
        }
      })
    );
  }

  /**
   *
   * @return {Promise<void>}
   * @private
   */
  async _initializeVars() {
    const oThis = this;
    oThis.chainEndpoint = oThis._configStrategyObject.chainWsProvider(oThis.auxChainId, 'readWrite');
  }

  async _validateMandatoryParams() {
    const oThis = this;

    if (!CommonValidators.validateEthAddress(oThis.tokenCompanyTokenHolderAddress)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_es_siafcthibut_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            tokenCompanyTokenHolderAddress: oThis.tokenCompanyTokenHolderAddress
          }
        })
      );
    }
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

    oThis.workerAddress = getAddrRsp.data[tokenAddressConstants.auxWorkerAddressKind][0];
    oThis.utilityBTContractAddress = getAddrRsp.data[tokenAddressConstants.utilityBrandedTokenContract];

    if (!oThis.workerAddress || !oThis.utilityBTContractAddress) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_es_siafcthibut_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            workerAddress: oThis.workerAddress,
            utilityBTContractAddress: oThis.utilityBTContractAddress
          }
        })
      );
    }
  }

  /**
   * _setInternalActorInUBT
   *
   * @return {Promise<void>}
   * @private
   */
  async _setInternalActorInUBT() {
    const oThis = this;

    return new SetInternalActorInUBT({
      chainId: oThis.auxChainId,
      chainEndpoint: oThis.chainEndpoint,
      signerAddress: oThis.workerAddress,
      actorAddress: oThis.tokenCompanyTokenHolderAddress,
      utilityBTContractAddress: oThis.utilityBTContractAddress,
      gasPrice: contractConstants.auxChainGasPrice,
      pendingTransactionExtraData: oThis.pendingTransactionExtraData
    }).perform();
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
  SetInternalActorForCompanyTokenHolderInUBT,
  coreConstants.icNameSpace,
  'SetInternalActorForCompanyTokenHolderInUBT'
);

module.exports = SetInternalActorForCompanyTokenHolderInUBT;
