'use strict';

const rootPrefix = '../..',
  testStepss1 = require(rootPrefix + '/lib/workflow/testSteps/s1'),
  testStepss2 = require(rootPrefix + '/lib/workflow/testSteps/s2'),
  testStepss33 = require(rootPrefix + '/lib/workflow/testSteps/s33'),
  testStepss4 = require(rootPrefix + '/lib/workflow/testSteps/s4'),
  testStepss5 = require(rootPrefix + '/lib/workflow/testSteps/s5'),
  testStepss6 = require(rootPrefix + '/lib/workflow/testSteps/s6'),
  testStepss7 = require(rootPrefix + '/lib/workflow/testSteps/s7'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  WorkflowRouterBase = require(rootPrefix + '/executables/workflowRouter/Base'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  testStepsConfigs = require(rootPrefix + '/executables/workflowRouter/testStepsConfigs');

class testProcessRouter extends WorkflowRouterBase {
  constructor(params) {
    params['workflowKind'] = workflowConstants.testKind;
    super(params);
  }

  /**
   * Fetch current step config for every router.
   *
   * @private
   */
  _fetchCurrentStepConfig() {
    const oThis = this;

    oThis.currentStepConfig = testStepsConfigs[oThis.stepKind];
  }

  async _performStep() {
    const oThis = this;

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
