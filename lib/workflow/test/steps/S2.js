'use strict';

const rootPrefix = '../../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

class TestWorkflowStepS2 {
  constructor() {}

  async perform(stepDetails) {
    console.log('working into S2');
    await basicHelper.sleep(2000);
    console.log('Completed S2');

    return responseHelper.successWithData({ taskStatus: workflowStepConstants.taskDone });
  }
}

module.exports = TestWorkflowStepS2;
