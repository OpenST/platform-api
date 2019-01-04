'use strict';

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

class testWorkflowS4 {
  constructor() {}

  async perform(stepDetails) {
    console.log('working into S4');
    await basicHelper.pauseForMilliSeconds(1000);
    console.log('Completed S4');

    return Promise.resolve(responseHelper.successWithData({ taskDone: 1 }));
  }
}

module.exports = testWorkflowS4;
