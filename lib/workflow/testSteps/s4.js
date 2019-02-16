'use strict';

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

class testWorkflowS4 {
  constructor() {}

  async perform(stepDetails) {
    console.log('working into S4');
    await basicHelper.pauseForMilliSeconds(1000);
    console.log('Completed S4');

    return responseHelper.successWithData({ taskStatus: workflowStepConstants.taskDone });
  }
}

module.exports = testWorkflowS4;
