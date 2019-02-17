'use strict';

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

class testWorkflowS2 {
  constructor() {}

  async perform(stepDetails) {
    console.log('working into S2');
    await basicHelper.pauseForMilliSeconds(2000);
    console.log('Completed S2');

    return responseHelper.successWithData({ taskStatus: workflowStepConstants.taskDone });
  }
}

module.exports = testWorkflowS2;
