'use strict';
/**
 * State root sync router
 *
 * @module executables/workflowRouter/StateRootSyncRouter
 */
const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  CommitStateRoot = require(rootPrefix + '/lib/stateRootSync/CommitStateRoot'),
  WorkflowRouterBase = require(rootPrefix + '/executables/workflowRouter/base'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  UpdateStateRootCommits = require(rootPrefix + '/lib/stateRootSync/UpdateStateRootCommits'),
  stateRootSyncStepsConfig = require(rootPrefix + '/executables/workflowRouter/stateRootSyncConfig');

/**
 * Class for state root sync router.
 *
 * @class
 */
class StateRootSyncRouter extends WorkflowRouterBase {
  /**
   * Constructor for state root sync router.
   *
   * @constructor
   */
  constructor(params) {
    params['workflowKind'] = workflowConstants.stateRootSyncKind; // Assign workflowKind.

    super(params);
  }

  /**
   * Fetch current step config for every router.
   *
   * @private
   */
  _fetchCurrentStepConfig() {
    const oThis = this;

    oThis.currentStepConfig = stateRootSyncStepsConfig[oThis.stepKind];
  }

  /**
   * Perform step.
   *
   * @return {Promise<*>}
   *
   * @private
   */
  async _performStep() {
    const oThis = this;

    switch (oThis.stepKind) {
      case workflowStepConstants.commitStateRootInit:
        return oThis.insertInitStep();

      // Commit state root
      case workflowStepConstants.commitStateRoot:
        return new CommitStateRoot(oThis.requestParams).perform(oThis._currentStepPayloadForPendingTrx());

      // Update status in state root commit history
      case workflowStepConstants.updateCommittedStateRootInfo:
        let updateStateRootCommits = new UpdateStateRootCommits(oThis.requestParams);
        return updateStateRootCommits.perform();

      case workflowStepConstants.markSuccess:
        logger.step('*** Mark State Root Sync As Success');

        return await oThis.handleSuccess();

      case workflowStepConstants.markFailure:
        logger.step('*** Mark State Root Sync As Failed');

        return await oThis.handleFailure();

      default:
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'e_wr_srsr_1',
            api_error_identifier: 'something_went_wrong',
            debug_options: { workflowId: oThis.workflowId }
          })
        );
    }
  }

  /**
   * Get next step configs.
   *
   * @param nextStep
   *
   * @return {*}
   */
  getNextStepConfigs(nextStep) {
    return stateRootSyncStepsConfig[nextStep];
  }
}

module.exports = StateRootSyncRouter;
