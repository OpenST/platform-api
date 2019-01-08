'use strict';

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

class testWorkflowS1 {
  constructor() {}

  async perform(stepDetails) {
    console.log('working into S1');
    await basicHelper.pauseForMilliSeconds(1000);
    console.log('Completed S1');

    return Promise.resolve(responseHelper.successWithData({ taskDone: 1, taskResponseData: {} }));
  }
}

module.exports = testWorkflowS1;
