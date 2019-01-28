'use strict';

/**
 * Class for Economy setup flow config.
 *
 * @module executables/workflowRouter/grantEthOstConfig
 */
const rootPrefix = '../..',
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

//NOTE: These steps are also used in KIT-API for showing progress. Any change here would have to be synced with KIT-API.

const grantEthOstConfig = {
  [workflowStepConstants.grantEthOstInit]: {
    kind: workflowStepConstants.grantEthOstInit,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.grantEth, workflowStepConstants.grantOst]
  },
  [workflowStepConstants.grantEth]: {
    kind: workflowStepConstants.grantEth,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.markSuccess]
  },
  [workflowStepConstants.grantOst]: {
    kind: workflowStepConstants.grantOst,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.markSuccess]
  },
  [workflowStepConstants.markSuccess]: {
    kind: workflowStepConstants.markSuccess,
    prerequisites: [workflowStepConstants.grantEth, workflowStepConstants.grantOst],
    onFailure: workflowStepConstants.markFailure,
    onSuccess: []
  },
  [workflowStepConstants.markFailure]: {
    kind: workflowStepConstants.markFailure,
    onSuccess: []
  }
};

module.exports = grantEthOstConfig;
