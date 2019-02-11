'use strict';
/**
 * User Setup router
 *
 * @module executables/auxWorkflowRouter/UserSetupRouter
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  AuxWorkflowRouterBase = require(rootPrefix + '/executables/auxWorkflowRouter/Base'),
  AddUserInWalletFactory = require(rootPrefix + '/lib/setup/user/AddUserInUserWalletFactory'),
  userSetupStepsConfig = require(rootPrefix + '/executables/auxWorkflowRouter/userSetupConfig'),
  FetchUserRegisteredEvent = require(rootPrefix + '/lib/setup/user/FetchRegisteredUserDetails');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/setup/user/ActivateUser');
require(rootPrefix + '/lib/setup/user/AddSessionAddresses');
require(rootPrefix + '/lib/setup/user/RollbackUserActivation');

/**
 * Class for User Setup router.
 *
 * @class
 */
class UserSetupRouter extends AuxWorkflowRouterBase {
  /**
   * Constructor for User Setup router.
   *
   * @constructor
   */
  constructor(params) {
    params['workflowKind'] = workflowConstants.setupUserKind; // Assign workflowKind.

    super(params);
  }

  /**
   * Fetch current step config for every router.
   *
   * @private
   */
  _fetchCurrentStepConfig() {
    const oThis = this;

    oThis.currentStepConfig = userSetupStepsConfig[oThis.stepKind];
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
      case workflowStepConstants.userSetupInit:
        return oThis.insertInitStep();

      // Add Session addresses
      case workflowStepConstants.addSessionAddresses:
        let AddSessionAddressKlass = ic.getShadowedClassFor(coreConstants.icNameSpace, 'AddSessionAddresses'),
          addSessionAddrObj = new AddSessionAddressKlass(oThis.requestParams);

        return addSessionAddrObj.perform();

      // Add user in User wallet factory.
      case workflowStepConstants.addUserInWalletFactory:
        return new AddUserInWalletFactory(oThis.requestParams).perform(oThis._currentStepPayloadForPendingTrx());

      // Add user in User wallet factory.
      case workflowStepConstants.fetchRegisteredUserEvent:
        return new FetchUserRegisteredEvent(oThis.requestParams).perform();

      // Update Contract addresses in user and activate it.
      case workflowStepConstants.activateUser:
        let ActivateUserKlass = ic.getShadowedClassFor(coreConstants.icNameSpace, 'ActivateUser'),
          activateUserObj = new ActivateUserKlass(oThis.requestParams);

        return activateUserObj.perform();

      // Rollback user and device and sessions
      case workflowStepConstants.rollbackUserSetup:
        let RollbackKlass = ic.getShadowedClassFor(coreConstants.icNameSpace, 'RollbackUserActivation'),
          rollbackObj = new RollbackKlass(oThis.requestParams);

        return rollbackObj.perform();

      case workflowStepConstants.markSuccess:
        logger.step('*** Mark User SetUp As Success.');

        return await oThis.handleSuccess();

      case workflowStepConstants.markFailure:
        logger.step('*** Mark User SetUp As Failed');

        return await oThis.handleFailure();

      default:
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'e_awr_usr_1',
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
    return userSetupStepsConfig[nextStep];
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

module.exports = UserSetupRouter;
