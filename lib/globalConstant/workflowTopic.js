'use strict';

class WorkflowTopicConstant {
  constructor() {}

  get test() {
    return 'workflow.test';
  }

  get onboading() {
    return 'workflow.onboading';
  }
}

module.exports = new WorkflowTopicConstant();
