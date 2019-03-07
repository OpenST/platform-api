'use strict';

const rootPrefix = '../../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

class TestWorkflowStepS33 {
  constructor() {}

  async perform(stepDetails) {
    console.log('working into S33');
    await basicHelper.sleep(1000);
    console.log('Completed S33');

    return responseHelper.successWithData({ taskStatus: workflowStepConstants.taskDone });
  }
}

module.exports = TestWorkflowStepS33;
