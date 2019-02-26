/**
 * Reset recovery owner router.
 *
 * @module executables/auxWorkflowRouter/recoveryOperation/byOwner/ResetRecoveryOwnerRouter
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  AuxWorkflowRouterBase = require(rootPrefix + '/executables/auxWorkflowRouter/Base'),
  resetRecoveryOwnerConfig = require(rootPrefix +
    '/executables/auxWorkflowRouter/recoveryOperation/byOwner/resetRecoveryOwnerConfig');

/**
 * Class for reset recovery owner router.
 *
 * @class ResetRecoveryOwnerRouter
 */
class ResetRecoveryOwnerRouter extends AuxWorkflowRouterBase {
  /**
   * Constructor for reset recovery owner router.
   *
   * @constructor
   */
  constructor(params) {
    params['workflowKind'] = workflowConstants.resetRecoveryOwnerKind; // Assign workflowKind.

    super(params);
  }

  /**
   * Fetch current step config for every router.
   *
   * @private
   */
  _fetchCurrentStepConfig() {
    const oThis = this;

    oThis.currentStepConfig = resetRecoveryOwnerConfig[oThis.stepKind];
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

    const configStrategy = await oThis.getConfigStrategy(),
      ic = new InstanceComposer(configStrategy);

    switch (oThis.stepKind) {
      case workflowStepConstants.resetRecoveryOwnerInit:
        logger.step('**********', workflowStepConstants.resetRecoveryOwnerInit);

        return oThis.insertInitStep();

      // Perform transaction to reset recovery owner.
      case workflowStepConstants.resetRecoveryOwnerPerformTransaction:
        logger.step('**********', workflowStepConstants.resetRecoveryOwnerPerformTransaction);

        require(rootPrefix + '/lib/deviceRecovery/byOwner/resetRecoveryOwner/PerformTransaction');

        oThis.requestParams.pendingTransactionExtraData = oThis._currentStepPayloadForPendingTrx();
        oThis.requestParams.workflowId = oThis.workflowId;

        const PerformResetRecoveryOwnerTransaction = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'PerformResetRecoveryOwnerTransaction'
          ),
          performResetRecoveryOwnerTransactionObj = new PerformResetRecoveryOwnerTransaction(oThis.requestParams);

        return performResetRecoveryOwnerTransactionObj.perform();

      // Verify reset recovery owner transaction.
      case workflowStepConstants.resetRecoveryOwnerVerifyTransaction:
        logger.step('**********', workflowStepConstants.resetRecoveryOwnerVerifyTransaction);

        require(rootPrefix + '/lib/deviceRecovery/byOwner/resetRecoveryOwner/VerifyTransaction');

        const VerifyResetRecoveryOwnerTransaction = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'VerifyResetRecoveryOwnerTransaction'
          ),
          verifyResetRecoveryOwnerTransactionObj = new VerifyResetRecoveryOwnerTransaction(oThis.requestParams);

        return verifyResetRecoveryOwnerTransactionObj.perform();

      case workflowStepConstants.markSuccess:
        logger.step('*** Mark Reset Recovery Owner As Success.');

        return await oThis.handleSuccess();

      case workflowStepConstants.markFailure:
        logger.step('*** Mark Reset Recovery Owner As Failed');

        return await oThis.handleFailure();

      default:
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'e_awr_ro_bo_rror_1',
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
    return resetRecoveryOwnerConfig[nextStep];
  }

  /**
   * Get config strategy.
   *
   * @return {Promise<*>}
   */
  async getConfigStrategy() {
    const oThis = this;

    const rsp = await chainConfigProvider.getFor([oThis.chainId]);

    return rsp[oThis.chainId];
  }
}

module.exports = ResetRecoveryOwnerRouter;
