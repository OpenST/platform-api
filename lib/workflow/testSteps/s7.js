'use strict';

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

class testWorkflowS7 {
  constructor() {}

  async perform(stepDetails) {
    console.log('working into S7');
    await basicHelper.pauseForMilliSeconds(1000);
    console.log('Completed S7');

    return Promise.resolve(responseHelper.successWithData({ taskStatus: workflowStepConstants.taskDone }));
  }
}

module.exports = testWorkflowS7;
