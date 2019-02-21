'use strict';
/**
 * User Setup router
 *
 * @module executables/auxWorkflowRouter/UserSetupRouter
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  AuxWorkflowRouterBase = require(rootPrefix + '/executables/auxWorkflowRouter/Base'),
  revokeDeviceStepsConfig = require(rootPrefix + '/executables/auxWorkflowRouter/multisigOperation/revokeDeviceConfig');

/**
 *
 *
 * @class
 */
class RevokeDeviceRouter extends AuxWorkflowRouterBase {
  /**
   * Constructor for User Setup router.
   *
   * @constructor
   */
  constructor(params) {
    params['workflowKind'] = workflowConstants.revokeDeviceKind; // Assign workflowKind.
    super(params);
  }

  /**
   * Fetch current step config for every router.
   *
   * @private
   */
  _fetchCurrentStepConfig() {
    const oThis = this;

    oThis.currentStepConfig = revokeDeviceStepsConfig[oThis.stepKind];
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
      case workflowStepConstants.revokeDeviceInit:
        logger.step('**********', workflowStepConstants.revokeDeviceInit);
        return oThis.insertInitStep();

      // Add Session addresses
      case workflowStepConstants.revokeDevicePerformTransaction:
        logger.step('**********', workflowStepConstants.revokeDevicePerformTransaction);
        require(rootPrefix + '/lib/device/Revoke');
        oThis.requestParams.pendingTransactionExtraData = oThis._currentStepPayloadForPendingTrx();
        let RevokeDevicePerformTransaction = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'RevokeDevicePerformTransaction'
          ),
          revokeDevicePerformTransactionObj = new RevokeDevicePerformTransaction(oThis.requestParams);

        return revokeDevicePerformTransactionObj.perform();

      // Add user in User wallet factory.
      case workflowStepConstants.revokeDeviceVerifyTransaction:
        logger.step('**********', workflowStepConstants.revokeDeviceVerifyTransaction);
        require(rootPrefix + '/lib/device/VerifyRevoke');
        let VerifyRevokeDeviceTransaction = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'VerifyRevokeDeviceTransaction'
          ),
          verifyRevokeDeviceTransactionObj = new VerifyRevokeDeviceTransaction(oThis.requestParams);

        return verifyRevokeDeviceTransactionObj.perform();

      case workflowStepConstants.rollbackRevokeDeviceTransaction:
        logger.step('**********', workflowStepConstants.rollbackRevokeDeviceTransaction);
        require(rootPrefix + '/lib/device/RollbackRevokeDevice');
        let RollbackRevokeTransaction = ic.getShadowedClassFor(coreConstants.icNameSpace, 'RollbackRevokeDevice'),
          rollbackRevokeTransactionObj = new RollbackRevokeTransaction(oThis.requestParams);

        return rollbackRevokeTransactionObj.perform();

      case workflowStepConstants.markSuccess:
        logger.step('*** Mark Revoke Device As Success.');

        return await oThis.handleSuccess();

      case workflowStepConstants.markFailure:
        logger.step('*** Mark Revoke Device As Failed');

        return await oThis.handleFailure();

      default:
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'e_awr_mo_rdr_1',
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
    return revokeDeviceStepsConfig[nextStep];
  }

  /**
   * Get config strategy.
   *
   * @return {Promise<*>}
   */
  async getConfigStrategy() {
    const oThis = this;

    let rsp = await chainConfigProvider.getFor([oThis.chainId]);

    return rsp[oThis.chainId];
  }
}

module.exports = RevokeDeviceRouter;
