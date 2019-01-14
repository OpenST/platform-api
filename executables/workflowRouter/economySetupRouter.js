'use strict';

const OSTBase = require('@openstfoundation/openst-base');

const rootPrefix = '../..',
  generateTokenAddresses = require(rootPrefix + '/lib/setup/economy/GenerateKnownAddresses'),
  DeployTokenOrganization = require(rootPrefix + '/lib/setup/economy/DeployTokenOrganization'),
  economySetupConfig = require(rootPrefix + '/executables/workflowRouter/economySetupConfig'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  workflowRouterBase = require(rootPrefix + '/executables/workflowRouter/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

const InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/lib/setup/economy/DeployTokenOrganization');
require(rootPrefix + '/lib/setup/economy/brandedToken/DeployBT');
require(rootPrefix + '/lib/setup/economy/brandedToken/DeployUBT');
require(rootPrefix + '/lib/setup/economy/DeployGateway');
require(rootPrefix + '/lib/setup/economy/DeployCoGateway');
require(rootPrefix + '/lib/setup/economy/ActivateGateway');
require(rootPrefix + '/lib/setup/economy/SetCoGatewayInUtilityBT');
require(rootPrefix + '/lib/setup/economy/SetGatewayInBT');

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

    switch (oThis.stepKind) {
      case workflowStepConstants.economySetupInit:
        return oThis.insertInitStep();

      case workflowStepConstants.generateTokenAddresses:
        return new generateTokenAddresses(oThis.requestParams).perform();
      case workflowStepConstants.deployOriginTokenOrganization:
        let deployOrigTokenOrganizationKlass = ic.getShadowedClassFor(
          coreConstants.icNameSpace,
          'DeployTokenOrganization'
        );
        oThis.requestParams.deployToChainKind = coreConstants.originChainKind;
        return new deployOrigTokenOrganizationKlass(oThis.requestParams).perform();
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

  getNextStepConfigs(nextStep) {
    return economySetupConfig[nextStep];
  }
}

module.exports = economySetupRouter;
