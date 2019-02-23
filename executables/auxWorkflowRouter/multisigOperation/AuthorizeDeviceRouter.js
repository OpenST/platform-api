'use strict';
/**
 * Authorize device router.
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
  authorizeDeviceStepsConfig = require(rootPrefix +
    '/executables/auxWorkflowRouter/multisigOperation/authorizeDeviceConfig');

/**
 * Class for authorize device router.
 *
 * @class AuthorizeDeviceRouter
 */
class AuthorizeDeviceRouter extends AuxWorkflowRouterBase {
  /**
   * Constructor for authorize device router.
   *
   * @constructor
   */
  constructor(params) {
    params['workflowKind'] = workflowConstants.authorizeDeviceKind; // Assign workflowKind.

    super(params);
  }

  /**
   * Fetch current step config for every router.
   *
   * @private
   */
  _fetchCurrentStepConfig() {
    const oThis = this;

    oThis.currentStepConfig = authorizeDeviceStepsConfig[oThis.stepKind];
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
      case workflowStepConstants.initiateRecoveryInit:
        logger.step('**********', workflowStepConstants.initiateRecoveryInit);
        return oThis.insertInitStep();

      // Add Session addresses
      case workflowStepConstants.authorizeDevicePerformTransaction:
        logger.step('**********', workflowStepConstants.authorizeDevicePerformTransaction);
        require(rootPrefix + '/lib/device/Authorize');
        oThis.requestParams.pendingTransactionExtraData = oThis._currentStepPayloadForPendingTrx();
        let AuthorizeDevicePerformTransaction = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'AuthorizeDevicePerformTransaction'
          ),
          authorizeDevicePerformTransactionObj = new AuthorizeDevicePerformTransaction(oThis.requestParams);

        return authorizeDevicePerformTransactionObj.perform();

      // Add user in User wallet factory.
      case workflowStepConstants.authorizeDeviceVerifyTransaction:
        logger.step('**********', workflowStepConstants.authorizeDeviceVerifyTransaction);
        require(rootPrefix + '/lib/device/VerifyAuthorize');
        let VerifyAuthorizeDeviceTransaction = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'VerifyAuthorizeDeviceTransaction'
          ),
          verifyAuthorizeDeviceTransactionObj = new VerifyAuthorizeDeviceTransaction(oThis.requestParams);

        return verifyAuthorizeDeviceTransactionObj.perform();

      case workflowStepConstants.rollbackAuthorizeDeviceTransaction:
        logger.step('**********', workflowStepConstants.rollbackAuthorizeDeviceTransaction);
        require(rootPrefix + '/lib/device/RollbackAuthorizeDevice');
        let RollbackAuthorizeTransaction = ic.getShadowedClassFor(coreConstants.icNameSpace, 'RollbackAuthorizeDevice'),
          rollbackAuthorizeTransactionObj = new RollbackAuthorizeTransaction(oThis.requestParams);

        return rollbackAuthorizeTransactionObj.perform();

      case workflowStepConstants.markSuccess:
        logger.step('*** Mark Authorize Device As Success.');

        return await oThis.handleSuccess();

      case workflowStepConstants.markFailure:
        logger.step('*** Mark Authorize Device As Failed');

        return await oThis.handleFailure();

      default:
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'e_awr_mo_adr_1',
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
    return authorizeDeviceStepsConfig[nextStep];
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

module.exports = AuthorizeDeviceRouter;
