'use strict';

const rootPrefix = '../..',
  testStepss1 = require(rootPrefix + '/lib/workflow/testSteps/s1'),
  testStepss2 = require(rootPrefix + '/lib/workflow/testSteps/s2'),
  testStepss33 = require(rootPrefix + '/lib/workflow/testSteps/s33'),
  testStepss4 = require(rootPrefix + '/lib/workflow/testSteps/s4'),
  testStepss5 = require(rootPrefix + '/lib/workflow/testSteps/s5'),
  testStepss6 = require(rootPrefix + '/lib/workflow/testSteps/s6'),
  testStepss7 = require(rootPrefix + '/lib/workflow/testSteps/s7'),
  testStepsConfigs = require(rootPrefix + '/executables/workflowRouter/testStepsConfigs'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowRouterBase = require(rootPrefix + '/executables/workflowRouter/base');

class testProcessRouter extends workflowRouterBase {
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.currentStepConfig = testStepsConfigs[oThis.stepKind];
  }

  async stepsFactory() {
    const oThis = this;

    console.log('-----------------------------stepsFactory--');
    switch (oThis.stepKind) {
      case workflowStepConstants.testInit:
        return oThis.insertInitStep();

      case workflowStepConstants.s1:
        return new testStepss1().perform();
      case workflowStepConstants.s2:
        return new testStepss2().perform();
      case workflowStepConstants.s33:
        return new testStepss33().perform();
      case workflowStepConstants.s4:
        return new testStepss4().perform();
      case workflowStepConstants.s5:
        return new testStepss5().perform();
      case workflowStepConstants.s6:
        console.log('-------oThis.requestParams--in router----', JSON.stringify(oThis.requestParams));
        return new testStepss6().perform();
      case workflowStepConstants.s7:
        return new testStepss7().perform();

      default:
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'e_wr_tpr_1',
            api_error_identifier: 'something_went_wrong',
            debug_options: { parentStepId: oThis.parentStepId }
          })
        );
    }
  }

  getNextStepConfigs(nextStep) {
    return testStepsConfigs[nextStep];
  }
}

module.exports = testProcessRouter;
