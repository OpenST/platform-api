'use strict';

const rootPrefix = '../..',
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  stateRootSyncStepsConfig = require(rootPrefix + '/executables/workflowRouter/stateRootSyncConfig'),
  WorkflowRouterBase = require(rootPrefix + '/executables/workflowRouter/base'),
  UpdateStateRootCommits = require(rootPrefix + '/lib/stateRootSync/UpdateStateRootCommits'),
  CommitStateRoot = require(rootPrefix + '/lib/stateRootSync/commitStateRoot');

class StateRootSyncRouter extends WorkflowRouterBase {
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.currentStepConfig = stateRootSyncStepsConfig[oThis.stepKind];
  }

  /**
   * stepsFactory
   *
   * @return {Promise<*>}
   */
  async stepsFactory() {
    const oThis = this;

    switch (oThis.stepKind) {
      case workflowStepConstants.commitStateRootInit:
        return oThis.insertInitStep();

      // commit state root
      case workflowStepConstants.commitStateRoot:
        return new CommitStateRoot(oThis.requestParams).perform(oThis._currentStepPayloadForPendingTrx());

      // update status in state root commit history
      case workflowStepConstants.updateCommittedStateRootInfo:
        let updateStateRootCommits = new UpdateStateRootCommits(oThis.requestParams);
        return updateStateRootCommits.perform();

      default:
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'e_wr_srsr_1',
            api_error_identifier: 'something_went_wrong',
            debug_options: { parentStepId: oThis.parentStepId }
          })
        );
    }
  }

  /**
   * getNextStepConfigs
   *
   * @param nextStep
   * @return {*}
   */
  getNextStepConfigs(nextStep) {
    return stateRootSyncStepsConfig[nextStep];
  }
}

module.exports = StateRootSyncRouter;
