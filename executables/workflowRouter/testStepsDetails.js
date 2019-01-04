'use strict';

const rootPrefix = '../..',
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

const steps = {
  [workflowStepConstants.init]: {
    kind: 'init',
    onFailure: '',
    onSuccess: [workflowStepConstants.s1]
  },
  [workflowStepConstants.s1]: {
    kind: 's1',
    onFailure: '',
    onSuccess: [workflowStepConstants.s2]
  },
  [workflowStepConstants.s2]: {
    kind: 's2',
    onFailure: '',
    onSuccess: [workflowStepConstants.s33, workflowStepConstants.s4]
  },
  [workflowStepConstants.s33]: {
    kind: 's3',
    onFailure: '',
    onSuccess: [workflowStepConstants.s5]
  },
  [workflowStepConstants.s4]: {
    kind: 's4',
    onFailure: '',
    onSuccess: [workflowStepConstants.s6]
  },
  [workflowStepConstants.s5]: {
    kind: 's5',
    onFailure: '',
    onSuccess: [workflowStepConstants.s6]
  },
  [workflowStepConstants.s6]: {
    kind: 's6',
    onFailure: '',
    onSuccess: [workflowStepConstants.s7],
    prerequisites: [workflowStepConstants.s4, workflowStepConstants.s5]
  },
  [workflowStepConstants.s7]: {
    kind: 's7',
    onFailure: '',
    onSuccess: []
  }
};

module.exports = steps;
