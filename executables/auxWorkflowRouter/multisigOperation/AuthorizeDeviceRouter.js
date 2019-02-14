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
  AddUserInWalletFactory = require(rootPrefix + '/lib/setup/user/AddUserInUserWalletFactory'),
  authorizeDeviceStepsConfig = require(rootPrefix +
    '/executables/auxWorkflowRouter/multisigOperation/authorizeDeviceConfig');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/setup/user/ActivateUser');
require(rootPrefix + '/lib/setup/user/AddSessionAddresses');
require(rootPrefix + '/lib/setup/user/RollbackUserActivation');

/**
 * Class for User Setup router.
 *
 * @class
 */
class AuthorizeDeviceRouter extends AuxWorkflowRouterBase {
  /**
   * Constructor for User Setup router.
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
      case workflowStepConstants.authorizeDeviceInit:
        logger.step('**********', workflowStepConstants.authorizeDeviceInit);
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
            'VerifyAuthorizeTransaction'
          ),
          verifyAuthorizeDeviceTransactionObj = new VerifyAuthorizeDeviceTransaction(oThis.requestParams);

        return verifyAuthorizeDeviceTransactionObj.perform();

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

    let rsp = await chainConfigProvider.getFor([oThis.chainId]);

    return rsp[oThis.chainId];
  }
}

module.exports = AuthorizeDeviceRouter;
