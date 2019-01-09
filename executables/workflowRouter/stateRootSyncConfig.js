'use strict';

const rootPrefix = '../..',
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

const steps = {
  [workflowStepConstants.init]: {
    kind: 'init',
    onFailure: '',
    onSuccess: [workflowStepConstants.commitStateRoot]
  },
  [workflowStepConstants.commitStateRoot]: {
    kind: 'commitStateRoot',
    onFailure: '',
    onSuccess: [workflowStepConstants.updateCommittedStateRootInfo]
  },
  [workflowStepConstants.updateCommittedStateRootInfo]: {
    kind: 'updateCommittedStateRootInfo',
    onFailure: '',
    onSuccess: []
  }
};

module.exports = steps;
