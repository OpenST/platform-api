'use strict';

class WorkflowTopicConstant {
  constructor() {}

  get test() {
    return 'workflow.test';
  }

  get economySetup() {
    return 'workflow.economySetup';
  }

  get stateRootSync() {
    return 'workflow.stateRootSync';
  }
}

module.exports = new WorkflowTopicConstant();
