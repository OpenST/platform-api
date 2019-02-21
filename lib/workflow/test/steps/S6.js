'use strict';

const rootPrefix = '../../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

class TestWorkflowStepS6 {
  constructor() {}

  async perform(stepDetails) {
    console.log('working into S6');
    await basicHelper.pauseForMilliSeconds(1000);
    console.log('Completed S6');

    return responseHelper.successWithData({ taskStatus: workflowStepConstants.taskDone });
  }
}

module.exports = TestWorkflowStepS6;
