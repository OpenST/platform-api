'use strict';
/**
 * Economy setup router
 *
 * @module executables/workflowRouter/economySetupRouter
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  TokenModel = require(rootPrefix + '/app/models/mysql/Token'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  SyncInView = require(rootPrefix + '/app/services/token/SyncInView'),
  tokenConstants = require(rootPrefix + '/lib/globalConstant/token'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  WorkflowStepsModel = require(rootPrefix + '/app/models/mysql/WorkflowStep'),
  workflowRouterBase = require(rootPrefix + '/executables/workflowRouter/base'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  generateTokenAddresses = require(rootPrefix + '/lib/setup/economy/GenerateKnownAddresses'),
  economySetupConfig = require(rootPrefix + '/executables/workflowRouter/economySetupConfig'),
  InsertAddressIntoTokenAddress = require(rootPrefix + '/lib/setup/economy/InsertAddressIntoTokenAddress');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/setup/economy/DeployGateway');
require(rootPrefix + '/lib/setup/economy/SetGatewayInBT');
require(rootPrefix + '/lib/setup/economy/DeployCoGateway');
require(rootPrefix + '/lib/setup/economy/ActivateGateway');
require(rootPrefix + '/lib/setup/economy/brandedToken/DeployBT');
require(rootPrefix + '/lib/setup/economy/brandedToken/DeployUBT');
require(rootPrefix + '/lib/setup/economy/SetCoGatewayInUtilityBT');
require(rootPrefix + '/lib/setup/economy/DeployTokenOrganization');

class economySetupRouter extends workflowRouterBase {
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.currentStepConfig = economySetupConfig[oThis.stepKind];
  }

  async stepsFactory() {
    const oThis = this;

    const configStrategy = await oThis.getConfigStrategy(),
      ic = new InstanceComposer(configStrategy);

    oThis.requestParams.pendingTransactionExtraData = oThis._currentStepPayloadForPendingTrx();

    switch (oThis.stepKind) {
      case workflowStepConstants.economySetupInit:
        logger.step('*** Economy Setup Init');
        return oThis.insertInitStep();

      case workflowStepConstants.generateTokenAddresses:
        logger.step('*** Generate Token Addresses');
        return new generateTokenAddresses(oThis.requestParams).perform();

      case workflowStepConstants.deployOriginTokenOrganization:
        logger.step('*** Deploy Origin Token Organization');
        let deployOrigTokenOrganizationKlass = ic.getShadowedClassFor(
          coreConstants.icNameSpace,
          'DeployTokenOrganization'
        );
        oThis.requestParams.deployToChainKind = coreConstants.originChainKind;
        return new deployOrigTokenOrganizationKlass(oThis.requestParams).perform();

      case workflowStepConstants.saveOriginTokenOrganization:
        logger.step('*** Saving Origin Organization Address In DB');
        return new InsertAddressIntoTokenAddress({
          tokenId: oThis.requestParams.tokenId,
          transactionHash: oThis.getTransactionHashForKind(oThis.stepKind),
          kind: tokenAddressConstants.originOrganizationContract
        }).perform();

      case workflowStepConstants.saveAuxTokenOrganization:
        logger.step('*** Saving Aux Organization Address In DB');
        return new InsertAddressIntoTokenAddress({
          tokenId: oThis.requestParams.tokenId,
          transactionHash: oThis.getTransactionHashForKind(oThis.stepKind),
          kind: tokenAddressConstants.auxOrganizationContract
        }).perform();

      case workflowStepConstants.saveOriginBrandedToken:
        logger.step('*** Saving Aux Organization Address In DB');
        return new InsertAddressIntoTokenAddress({
          tokenId: oThis.requestParams.tokenId,
          transactionHash: oThis.getTransactionHashForKind(oThis.stepKind),
          kind: tokenAddressConstants.brandedTokenContract
        }).perform();

      case workflowStepConstants.saveUtilityBrandedToken:
        logger.step('*** Saving Utility Branded Token Address In DB');
        return new InsertAddressIntoTokenAddress({
          tokenId: oThis.requestParams.tokenId,
          transactionHash: oThis.getTransactionHashForKind(oThis.stepKind),
          kind: tokenAddressConstants.utilityBrandedTokenContract
        }).perform();

      case workflowStepConstants.saveTokenGateway:
        logger.step('*** Saving Token Gateway Address In DB');
        return new InsertAddressIntoTokenAddress({
          tokenId: oThis.requestParams.tokenId,
          transactionHash: oThis.getTransactionHashForKind(oThis.stepKind),
          kind: tokenAddressConstants.tokenDeployGateway
        }).perform();

      case workflowStepConstants.saveTokenCoGateway:
        logger.step('*** Saving Token Co-Gateway Address In DB');
        return new InsertAddressIntoTokenAddress({
          tokenId: oThis.requestParams.tokenId,
          transactionHash: oThis.getTransactionHashForKind(oThis.stepKind),
          kind: tokenAddressConstants.tokenDeployCoGateway
        }).perform();

      case workflowStepConstants.deployOriginBrandedToken:
        let deployBrandeTokenKlass = ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeployOriginBrandedToken');
        return new deployBrandeTokenKlass(oThis.requestParams).perform();

      case workflowStepConstants.deployAuxTokenOrganization:
        let deployAuxTokenOrganizationKlass = ic.getShadowedClassFor(
          coreConstants.icNameSpace,
          'DeployTokenOrganization'
        );
        oThis.requestParams.deployToChainKind = coreConstants.auxChainKind;
        return new deployAuxTokenOrganizationKlass(oThis.requestParams).perform();

      case workflowStepConstants.deployUtilityBrandedToken:
        let deployUtilityBrandeTokenKlass = ic.getShadowedClassFor(
          coreConstants.icNameSpace,
          'DeployUtilityBrandedToken'
        );
        return new deployUtilityBrandeTokenKlass(oThis.requestParams).perform();

      case workflowStepConstants.tokenDeployGateway:
        let TokenDeployGatewayKlass = ic.getShadowedClassFor(coreConstants.icNameSpace, 'TokenDeployGateway');
        return new TokenDeployGatewayKlass(oThis.requestParams).perform();

      case workflowStepConstants.updateTokenInOstView:
        return new SyncInView({ tokenId: oThis.requestParams.tokenId, chainId: oThis.chainId }).perform();

      case workflowStepConstants.tokenDeployCoGateway:
        let TokenDeployCoGatewayKlass = ic.getShadowedClassFor(coreConstants.icNameSpace, 'TokenDeployCoGateway');
        return new TokenDeployCoGatewayKlass(oThis.requestParams).perform();

      case workflowStepConstants.activateTokenGateway:
        let ActivateTokenGatewayKlass = ic.getShadowedClassFor(coreConstants.icNameSpace, 'ActivateTokenGateway');
        return new ActivateTokenGatewayKlass(oThis.requestParams).perform();

      case workflowStepConstants.setCoGatewayInUbt:
        let setCoGatewayInUbtKlass = ic.getShadowedClassFor(coreConstants.icNameSpace, 'SetCoGatewayInUtilityBT');
        return new setCoGatewayInUbtKlass(oThis.requestParams).perform();

      case workflowStepConstants.setGatewayInBt:
        let setGatewayInBtKlass = ic.getShadowedClassFor(coreConstants.icNameSpace, 'SetGatewayInBT');
        return new setGatewayInBtKlass(oThis.requestParams).perform();

      case workflowStepConstants.markSuccess:
        return oThis._tokenDeploymentCompleted();

      case workflowStepConstants.markFailure:
        return oThis._tokenDeploymentFailed();

      default:
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'e_wr_esr_1',
            api_error_identifier: 'something_went_wrong',
            debug_options: { parentStepId: oThis.parentStepId }
          })
        );
    }
  }

  async getConfigStrategy() {
    const oThis = this;
    let rsp = await chainConfigProvider.getFor([oThis.chainId]);

    return rsp[oThis.chainId];
  }

  getTransactionHashForKind(kindStr) {
    const oThis = this,
      kindInt = new WorkflowStepsModel().invertedStatuses[kindStr];

    for (let workflowId in oThis.workflowRecordsMap) {
      let workflowData = oThis.workflowRecordsMap[workflowId];
      if (workflowData.kind === kindInt) {
        return workflowData.transaction_hash;
      }
    }

    return '';
  }

  /**
   * Mark token deployment as successful in tokens table.
   *
   * @return {Promise<any>}
   */
  async _tokenDeploymentCompleted() {
    const oThis = this;

    // Update status of token deployment as deploymentCompleted in tokens table.
    let tokenModelResp = await new TokenModel()
      .update({
        status: new TokenModel().invertedStatuses[tokenConstants.deploymentCompleted]
      })
      .where({
        client_id: oThis.clientId,
        status: new TokenModel().invertedStatuses[tokenConstants.deploymentStarted]
      })
      .fire();

    // If row was updated successfully.
    if (+tokenModelResp.affectedRows === 1) {
      // Implicit string to int conversion.
      return Promise.resolve(responseHelper.successWithData({ taskDone: 1 }));
    } else {
      return Promise.resolve(responseHelper.successWithData({ taskDone: -1 }));
    }
  }

  /**
   * Mark token deployment as failed in tokens table.
   *
   * @return {Promise<any>}
   */
  async _tokenDeploymentFailed() {
    const oThis = this;

    // Update status of token deployment as deploymentFailed in tokens table.
    let tokenModelResp = await new TokenModel()
      .update({
        status: new TokenModel().invertedStatuses[tokenConstants.deploymentFailed]
      })
      .where({
        client_id: oThis.clientId,
        status: new TokenModel().invertedStatuses[tokenConstants.deploymentStarted]
      })
      .fire();

    // If row was updated successfully.
    if (+tokenModelResp.affectedRows === 1) {
      // Implicit string to int conversion.
      return Promise.resolve(responseHelper.successWithData({ taskDone: 1 }));
    } else {
      return Promise.resolve(responseHelper.successWithData({ taskDone: -1 }));
    }
  }

  getNextStepConfigs(nextStep) {
    return economySetupConfig[nextStep];
  }
}

module.exports = economySetupRouter;
