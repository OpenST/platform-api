'use strict';

const OSTBase = require('@openstfoundation/openst-base');

const rootPrefix = '../..',
  generateTokenAddresses = require(rootPrefix + '/tools/economySetup/GenerateKnownAddresses'),
  deployTokenOrganization = require(rootPrefix + '/tools/economySetup/deployTokenOrganization'),
  economySetupConfig = require(rootPrefix + '/executables/workflowRouter/economySetupConfig'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  workflowRouterBase = require(rootPrefix + '/executables/workflowRouter/base'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

const InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/tools/economySetup/deployTokenOrganization');
require(rootPrefix + '/tools/economySetup/brandedToken/DeployBrandedToken');
require(rootPrefix + '/tools/economySetup/brandedToken/DeployUtilityBrandedToken');

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

    console.log('-----------------------------stepsFactory--', oThis.requestParams);
    switch (oThis.stepKind) {
      case workflowStepConstants.economySetupInit:
        return oThis.insertInitStep();

      case workflowStepConstants.generateTokenAddresses:
        return new generateTokenAddresses(oThis.requestParams).perform();
      case workflowStepConstants.deployOriginTokenOrganization:
        let deployOrigTokenOrganizationKlass = ic.getShadowedClassFor(
          coreConstants.icNameSpace,
          'deployTokenOrganization'
        );
        oThis.requestParams.deployToChainKind = coreConstants.originChainKind;
        return new deployOrigTokenOrganizationKlass(oThis.requestParams).perform();
      case workflowStepConstants.deployOriginBrandedToken:
        let deployBrandeTokenKlass = ic.getShadowedClassFor(coreConstants.icNameSpace, 'deployBrandedToken');
        return new deployBrandeTokenKlass(oThis.requestParams).perform();
      case workflowStepConstants.deployAuxTokenOrganization:
        let deployAuxTokenOrganizationKlass = ic.getShadowedClassFor(
          coreConstants.icNameSpace,
          'deployTokenOrganization'
        );
        oThis.requestParams.deployToChainKind = coreConstants.auxChainKind;
        return new deployAuxTokenOrganizationKlass(oThis.requestParams).perform();
      case workflowStepConstants.deployUtilityBrandedToken:
        let deployUtilityBrandeTokenKlass = ic.getShadowedClassFor(
          coreConstants.icNameSpace,
          'deployUtilityBrandedToken'
        );
        return new deployUtilityBrandeTokenKlass(oThis.requestParams).perform();
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
