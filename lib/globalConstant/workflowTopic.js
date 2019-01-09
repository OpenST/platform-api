'use strict';

class WorkflowTopicConstant {
  constructor() {}

  get test() {
    return 'workflow.test';
  }

  get onboading() {
    return 'workflow.onboading';
  }

  get stateRootSync() {
    return 'workflow.stateRootSync';
  }
}

module.exports = new WorkflowTopicConstant();
