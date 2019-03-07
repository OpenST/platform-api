'use strict';

const rootPrefix = '../../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

class TestWorkflowStepS5 {
  constructor() {}

  async perform(stepDetails) {
    console.log('working into S5');
    await basicHelper.sleep(1000);
    console.log('Completed S5');

    return responseHelper.successWithData({
      taskStatus: workflowStepConstants.taskDone,
      taskResponseData: { testRespHash: 'hdjskal123zxfnm 5' }
    });
  }
}

module.exports = TestWorkflowStepS5;
