'use strict';

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

class testWorkflowS6 {
  constructor() {}

  async perform(stepDetails) {
    console.log('working into S6');
    await basicHelper.pauseForMilliSeconds(1000);
    console.log('Completed S6');

    return Promise.resolve(responseHelper.successWithData({ taskDone: 1 }));
  }
}

module.exports = testWorkflowS6;
