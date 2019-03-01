'use strict';
/**
 * Steps config file for state root sync
 *
 * @module lib/workflow/stateRootSync/stepsConfig
 */

const rootPrefix = '../../..',
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

const stateRootSyncStepsConfig = {
  [workflowStepConstants.commitStateRootInit]: {
    kind: workflowStepConstants.commitStateRootInit,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.commitStateRoot]
  },
  [workflowStepConstants.commitStateRoot]: {
    kind: workflowStepConstants.commitStateRoot,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.updateCommittedStateRootInfo]
  },
  [workflowStepConstants.updateCommittedStateRootInfo]: {
    kind: workflowStepConstants.updateCommittedStateRootInfo,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.commitStateRoot],
    onSuccess: [workflowStepConstants.markSuccess]
  },
  [workflowStepConstants.markSuccess]: {
    kind: workflowStepConstants.markSuccess,
    onSuccess: []
  },
  [workflowStepConstants.markFailure]: {
    kind: workflowStepConstants.markFailure,
    onSuccess: []
  }
};

module.exports = stateRootSyncStepsConfig;
