/**
 * Config for update price point setup.
 *
 * @module lib/workflow/updatePricePoints/stepsConfig
 */

const rootPrefix = '../../..',
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

const updatePricePointStepsConfig = {
  [workflowStepConstants.updatePricePointInit]: {
    kind: workflowStepConstants.updatePricePointInit,
    onFailure: '',
    onSuccess: [workflowStepConstants.fetchPricePointFromCoinMarketCapApi]
  },
  [workflowStepConstants.fetchPricePointFromCoinMarketCapApi]: {
    kind: workflowStepConstants.fetchPricePointFromCoinMarketCapApi,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.setPriceInPriceOracleContract]
  },
  [workflowStepConstants.setPriceInPriceOracleContract]: {
    kind: workflowStepConstants.setPriceInPriceOracleContract,
    readDataFrom: [workflowStepConstants.fetchPricePointFromCoinMarketCapApi],
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.verifySetPriceInPriceOracleContract]
  },
  [workflowStepConstants.verifySetPriceInPriceOracleContract]: {
    kind: workflowStepConstants.verifySetPriceInPriceOracleContract,
    readDataFrom: [workflowStepConstants.setPriceInPriceOracleContract],
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.updatePricePointsInBlockScanner]
  },
  [workflowStepConstants.updatePricePointsInBlockScanner]: {
    kind: workflowStepConstants.updatePricePointsInBlockScanner,
    readDataFrom: [workflowStepConstants.setPriceInPriceOracleContract],
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.markSuccess]
  },
  [workflowStepConstants.markSuccess]: {
    kind: workflowStepConstants.markSuccess,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: []
  },
  [workflowStepConstants.markFailure]: {
    kind: workflowStepConstants.markFailure,
    onSuccess: []
  }
};

module.exports = updatePricePointStepsConfig;
