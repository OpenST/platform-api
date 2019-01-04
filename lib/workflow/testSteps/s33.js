'use strict';

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

class testWorkflowS33 {
  constructor() {}

  async perform(stepDetails) {
    console.log('working into S33');
    await basicHelper.pauseForMilliSeconds(1000);
    console.log('Completed S33');

    return Promise.resolve(responseHelper.successWithData({ taskDone: 1 }));
  }
}

module.exports = testWorkflowS33;
