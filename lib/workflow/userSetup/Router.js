/**
 * Module for user setup router.
 *
 * @module lib/workflow/userSetup/Router
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  AuxWorkflowRouterBase = require(rootPrefix + '/lib/workflow/AuxRouterBase'),
  AddUserInWalletFactory = require(rootPrefix + '/lib/setup/user/AddUserInUserWalletFactory'),
  VerifyInternalActorInUBTTrx = require(rootPrefix + '/lib/setup/user/verifyInternalActorInUBTTrx'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  userSetupStepsConfig = require(rootPrefix + '/lib/workflow/userSetup/stepsConfig'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  webhookSubscriptionsConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/setup/user/ActivateUser');
require(rootPrefix + '/lib/setup/user/AddSessionAddresses');
require(rootPrefix + '/lib/setup/user/RollbackUserActivation');
require(rootPrefix + '/lib/setup/user/FetchRegisteredUserDetails');
require(rootPrefix + '/lib/setup/economy/setInternalActorInUBT/Address');

/**
 * Class for user setup router.
 *
 * @class UserSetupRouter
 */
class UserSetupRouter extends AuxWorkflowRouterBase {
  /**
   * Constructor for user setup router.
   *
   * @augments AuxWorkflowRouterBase
   *
   * @constructor
   */
  constructor(params) {
    params.workflowKind = workflowConstants.setupUserKind; // Assign workflowKind.

    super(params);
  }

  /**
   * Fetch current step config for every router.
   *
   * @sets oThis.currentStepConfig
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
   * @private
   */
  async _performStep() {
    const oThis = this;

    const configStrategy = await oThis.getConfigStrategy(),
      ic = new InstanceComposer(configStrategy);

    switch (oThis.stepKind) {
      case workflowStepConstants.userSetupInit: {
        return oThis.insertInitStep();
      }
      // Add session addresses.
      case workflowStepConstants.addSessionAddresses: {
        const AddSessionAddressKlass = ic.getShadowedClassFor(coreConstants.icNameSpace, 'AddSessionAddresses'),
          addSessionAddrObj = new AddSessionAddressKlass(oThis.requestParams);

        return addSessionAddrObj.perform();
      }
      // Add user in User wallet factory.
      case workflowStepConstants.addUserInWalletFactory: {
        return new AddUserInWalletFactory(oThis.requestParams).perform(oThis._currentStepPayloadForPendingTrx());
      }

      // Fetch user registered event.
      case workflowStepConstants.fetchRegisteredUserEvent: {
        const FetchUserRegisteredEvent = ic.getShadowedClassFor(
          coreConstants.icNameSpace,
          'FetchRegisteredUserDetails'
        );

        return new FetchUserRegisteredEvent(oThis.requestParams).perform();
      }

      // Set internal actor for tokenHolder In UBT.
      case workflowStepConstants.setInternalActorForTokenHolderInUBT: {
        oThis.requestParams.address = oThis.requestParams.tokenHolderAddress;
        oThis.requestParams.pendingTransactionKind = pendingTransactionConstants.setInternalActorForUserTHInUBTKind;
        oThis.requestParams.pendingTransactionExtraData = oThis._currentStepPayloadForPendingTrx();
        const SetInternalActorForTokenHolderInUBT = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'SetInternalActorForUBT'
          ),
          setInternalActorForTokenHolderInUBTObj = new SetInternalActorForTokenHolderInUBT(oThis.requestParams);

        return setInternalActorForTokenHolderInUBTObj.perform();
      }

      // Verify internal actor for tokenHolder in UBT transaction.
      case workflowStepConstants.verifyInternalActorTransactionInUBT: {
        return new VerifyInternalActorInUBTTrx(oThis.requestParams).perform();
      }
      // Update Contract addresses in user and activate it.
      case workflowStepConstants.activateUser: {
        const ActivateUserKlass = ic.getShadowedClassFor(coreConstants.icNameSpace, 'ActivateUser'),
          activateUserObj = new ActivateUserKlass(oThis.requestParams);

        return activateUserObj.perform();
      }
      // Rollback user and device and sessions.
      case workflowStepConstants.rollbackUserSetup: {
        const RollbackKlass = ic.getShadowedClassFor(coreConstants.icNameSpace, 'RollbackUserActivation'),
          rollbackObj = new RollbackKlass(oThis.requestParams);

        return rollbackObj.perform();
      }
      case workflowStepConstants.markSuccess: {
        logger.step('*** Mark User SetUp As Success.');

        const preProcessorWebhookDetails = oThis.preProcessorWebhookDetails(true);

        await oThis.sendPreprocessorWebhook(preProcessorWebhookDetails.chainId, preProcessorWebhookDetails.payload);

        return await oThis.handleSuccess();
      }
      case workflowStepConstants.markFailure: {
        logger.step('*** Mark User SetUp As Failed');

        return await oThis.handleFailure();
      }
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
   * @param {string} nextStep
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

    const response = await chainConfigProvider.getFor([oThis.chainId]);

    return response[oThis.chainId];
  }

  /**
   * Get preprocessor webhook details.
   *
   * @param {boolean} status: true for success, false for failure.
   *
   * @returns {{chainId: *, payload: {webhookKind: string, clientId: number/string, userId: string}}}
   */
  preProcessorWebhookDetails(status) {
    const oThis = this;

    return {
      chainId: oThis.requestParams.auxChainId,
      payload: {
        webhookKind: status
          ? webhookSubscriptionsConstants.usersActivateTopic
          : webhookSubscriptionsConstants.usersActivateTopic,
        clientId: oThis.requestParams.auxChainId,
        userId: oThis.requestParams.userId
      }
    };
  }
}

module.exports = UserSetupRouter;
