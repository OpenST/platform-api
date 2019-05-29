/**
 * Module for logout session router.
 *
 * @module lib/workflow/logoutSessions/Router
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  AuxWorkflowRouterBase = require(rootPrefix + '/lib/workflow/AuxRouterBase'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  logoutSessionsStepsConfig = require(rootPrefix + '/lib/workflow/logoutSessions/stepsConfig'),
  webhookSubscriptionsConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions');

/**
 * Class for logout session router.
 *
 * @class LogoutSessionsRouter
 */
class LogoutSessionsRouter extends AuxWorkflowRouterBase {
  /**
   * Constructor for logout session router.
   *
   * @param {object} params
   *
   * @augments AuxWorkflowRouterBase
   *
   * @constructor
   */
  constructor(params) {
    params.workflowKind = workflowConstants.logoutSessionsKind; // Assign workflowKind.
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

    oThis.currentStepConfig = logoutSessionsStepsConfig[oThis.stepKind];
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
      case workflowStepConstants.logoutSessionInit: {
        logger.step('********** ', workflowStepConstants.logoutSessionInit);

        return oThis.insertInitStep();
      }
      case workflowStepConstants.logoutSessionPerformTransaction: {
        logger.step('********** ', workflowStepConstants.logoutSessionPerformTransaction);

        require(rootPrefix + '/lib/session/multisigOperation/Logout');

        oThis.requestParams.pendingTransactionExtraData = oThis._currentStepPayloadForPendingTrx();

        const logoutSessionPerformTransaction = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'LogoutSessionPerformTransaction'
          ),
          logoutSessionPerformTransactionObj = new logoutSessionPerformTransaction(oThis.requestParams);

        return logoutSessionPerformTransactionObj.perform();
      }

      case workflowStepConstants.logoutSessionVerifyTransaction: {
        logger.step('********** ', workflowStepConstants.logoutSessionVerifyTransaction);

        require(rootPrefix + '/lib/session/VerifyLogout');

        const VerifyLogoutSessionTransaction = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'VerifyLogoutSessionTransaction'
          ),
          verifyLogoutSessionTransactionObj = new VerifyLogoutSessionTransaction(oThis.requestParams);

        return verifyLogoutSessionTransactionObj.perform();
      }
      case workflowStepConstants.markSuccess: {
        logger.step('*** Mark logout Sessions As Success.');

        const preProcessorWebhookDetails = oThis.preProcessorWebhookDetails(true);

        await oThis.sendPreprocessorWebhook(preProcessorWebhookDetails.chainId, preProcessorWebhookDetails.payload);

        return await oThis.handleSuccess();
      }
      case workflowStepConstants.markFailure: {
        logger.step('*** Mark logout Sessions As Failed');

        return await oThis.handleFailure();
      }
      default: {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'l_w_ls_r_1',
            api_error_identifier: 'something_went_wrong',
            debug_options: { workflowId: oThis.workflowId }
          })
        );
      }
    }
  }

  /**
   * Get next step configs.
   *
   * @param {string} nextStep
   *
   * @return {*}
   */
  getNextStepConfigs(nextStep) {
    return logoutSessionsStepsConfig[nextStep];
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

  preProcessorWebhookDetails(status) {
    const oThis = this;

    return {
      chainId: oThis.requestParams.auxChainId,
      payload: {
        webhookKind: status
          ? webhookSubscriptionsConstants.sessionsLogoutAllTopic
          : webhookSubscriptionsConstants.sessionsLogoutAllTopic,
        clientId: oThis.requestParams.auxChainId,
        userId: oThis.requestParams.userId
      }
    };
  }
}

module.exports = LogoutSessionsRouter;
