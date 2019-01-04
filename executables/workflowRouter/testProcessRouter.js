'use strict';

const rootPrefix = '../..',
  testStepss1 = require(rootPrefix + '/lib/workflow/testSteps/s1'),
  testStepDetails = require(rootPrefix + '/executables/workflowRouter/testStepsDetails'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowRouterBase = require(rootPrefix + '/executables/workflowRouter/base');

class testProcessRouter extends workflowRouterBase {
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.currentStepDetails = testStepDetails[oThis.stepKind];
  }

  async stepsFactory() {
    const oThis = this;

    console.log('-----------------------------stepsFactory--');
    switch (oThis.stepKind) {
      case workflowStepConstants.init:
        return oThis.insertInitStep();

      case workflowStepConstants.s1:
        return new testStepss1().perform();

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
}

module.exports = testProcessRouter;
