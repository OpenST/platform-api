'use strict';

const rootPrefix = '../../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

class TestWorkflowStepS7 {
  constructor() {}

  async perform(stepDetails) {
    console.log('working into S7');
    await basicHelper.sleep(1000);
    console.log('Completed S7');

    return responseHelper.successWithData({ taskStatus: workflowStepConstants.taskDone });
  }
}

module.exports = TestWorkflowStepS7;
