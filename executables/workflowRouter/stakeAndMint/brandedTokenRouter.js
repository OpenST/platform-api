'use strict';

const rootPrefix = '../../..',
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  btMintingStepsConfig = require(rootPrefix + '/executables/workflowRouter/stakeAndMint/brandedTokenConfig'),
  WorkflowRouterBase = require(rootPrefix + '/executables/workflowRouter/base'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  ProcessTransaction = require(rootPrefix + '/lib/stakeMintManagement/brandedToken/ProcessTransaction'),
  FetchRequestHash = require(rootPrefix + '/lib/stakeMintManagement/brandedToken/FetchRequestHash'),
  CheckAllowance = require(rootPrefix + '/lib/stakeMintManagement/brandedToken/CheckAllowance'),
  CheckStepStatus = require(rootPrefix + '/lib/stakeMintManagement/common/CheckStepStatus'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

class BtMintRouter extends WorkflowRouterBase {
  constructor(params) {
    params['workflowKind'] = workflowConstants.btStakeAndMintKind; // Assign workflowKind.

    super(params);
  }

  /**
   * Fetch current step config for every router.
   *
   * @private
   */
  _fetchCurrentStepConfig() {
    const oThis = this;

    oThis.currentStepConfig = btMintingStepsConfig[oThis.stepKind];
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
      case workflowStepConstants.btStakeAndMintInit:
        return oThis.insertInitStep();

      case workflowStepConstants.btRequestStakeHandle:
        oThis.requestParams.transactionHash = oThis.requestParams.requestStakeTransactionHash;
        return new ProcessTransaction(oThis.requestParams).perform(oThis._currentStepPayloadForPendingTrx());

      case workflowStepConstants.checkRequestStakeTxStatus:
        oThis.requestParams.transactionHash = oThis.requestParams.requestStakeTransactionHash;
        let checkStepStatus = new CheckStepStatus(oThis.requestParams);
        return checkStepStatus.perform();

      case workflowStepConstants.fetchStakeRequestHash:
        oThis.requestParams.transactionHash = oThis.requestParams.requestStakeTransactionHash;
        return new FetchRequestHash(oThis.requestParams).perform();

      case workflowStepConstants.btApproveTxHandle:
        oThis.requestParams.transactionHash = oThis.requestParams.approveTransactionHash;
        return new ProcessTransaction(oThis.requestParams).perform(oThis._currentStepPayloadForPendingTrx());

      case workflowStepConstants.checkApproveTxStatus:
        oThis.requestParams.transactionHash = oThis.requestParams.approveTransactionHash;
        let checkApproveStatus = new CheckStepStatus(oThis.requestParams);
        return checkApproveStatus.perform();

      case workflowStepConstants.checkAllowance:
        return new CheckAllowance(oThis.requestParams).perform();

      case workflowStepConstants.markSuccess:
        logger.step('*** Mark branded token stake and mint as success');
        return oThis.handleSuccess();

      case workflowStepConstants.markFailure:
        logger.step('*** Mark branded token stake and mint as failed');
        return oThis.handleFailure();

      default:
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'e_wr_snm_btr_1',
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
    return btMintingStepsConfig[nextStep];
  }
}

module.exports = BtMintRouter;
