/**
 * Module for grant eth and stake currency flow config.
 *
 * @module lib/workflow/grantEthStakeCurrency/stepsConfig
 */

const rootPrefix = '../../..',
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

// NOTE: These steps are also used in KIT-API for showing progress. Any change here would have to be synced with KIT-API.

const grantEthStakeCurrencyStepsConfig = {
  [workflowStepConstants.grantEthStakeCurrencyInit]: {
    kind: workflowStepConstants.grantEthStakeCurrencyInit,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.grantEth, workflowStepConstants.grantStakeCurrency]
  },
  [workflowStepConstants.grantEth]: {
    kind: workflowStepConstants.grantEth,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.verifyGrantEth]
  },
  [workflowStepConstants.verifyGrantEth]: {
    kind: workflowStepConstants.verifyGrantEth,
    readDataFrom: [workflowStepConstants.grantEth],
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.markSuccess]
  },
  [workflowStepConstants.grantStakeCurrency]: {
    kind: workflowStepConstants.grantStakeCurrency,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.verifyGrantStakeCurrency]
  },
  [workflowStepConstants.verifyGrantStakeCurrency]: {
    kind: workflowStepConstants.verifyGrantStakeCurrency,
    readDataFrom: [workflowStepConstants.grantStakeCurrency],
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.markSuccess]
  },
  [workflowStepConstants.markSuccess]: {
    kind: workflowStepConstants.markSuccess,
    prerequisites: [workflowStepConstants.verifyGrantEth, workflowStepConstants.verifyGrantStakeCurrency],
    onFailure: workflowStepConstants.markFailure,
    onSuccess: []
  },
  [workflowStepConstants.markFailure]: {
    kind: workflowStepConstants.markFailure,
    onSuccess: []
  }
};

module.exports = grantEthStakeCurrencyStepsConfig;
