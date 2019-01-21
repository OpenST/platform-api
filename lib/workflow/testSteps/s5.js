'use strict';

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

class testWorkflowS5 {
  constructor() {}

  async perform(stepDetails) {
    console.log('working into S5');
    await basicHelper.pauseForMilliSeconds(1000);
    console.log('Completed S5');

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone,
        taskResponseData: { testRespHash: 'hdjskal123zxfnm 5' }
      })
    );
  }
}

module.exports = testWorkflowS5;
