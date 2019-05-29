/**
 * Module for revoke session router.
 *
 * @module lib/workflow/revokeSession/Router
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
  revokeSessionStepsConfig = require(rootPrefix + '/lib/workflow/revokeSession/stepsConfig'),
  webhookSubscriptionsConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions');

/**
 * Class for revoke session router.
 *
 * @class RevokeSessionRouter
 */
class RevokeSessionRouter extends AuxWorkflowRouterBase {
  /**
   * Constructor for revoke session router.
   *
   * @augments AuxWorkflowRouterBase
   *
   * @constructor
   */
  constructor(params) {
    params.workflowKind = workflowConstants.revokeSessionKind; // Assign workflowKind.
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

    oThis.currentStepConfig = revokeSessionStepsConfig[oThis.stepKind];
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
      case workflowStepConstants.revokeSessionInit: {
        logger.step('**********', workflowStepConstants.revokeSessionInit);

        return oThis.insertInitStep();
      }

      // Perform revoke session transaction.
      case workflowStepConstants.revokeSessionPerformTransaction: {
        logger.step('**********', workflowStepConstants.revokeSessionPerformTransaction);
        require(rootPrefix + '/lib/session/multisigOperation/Revoke');
        oThis.requestParams.pendingTransactionExtraData = oThis._currentStepPayloadForPendingTrx();
        const revokeSessionPerformTransaction = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'RevokeSessionPerformTransaction'
          ),
          revokeSessionPerformTransactionObj = new revokeSessionPerformTransaction(oThis.requestParams);

        return revokeSessionPerformTransactionObj.perform();
      }

      // Verify revoke session transaction.
      case workflowStepConstants.revokeSessionVerifyTransaction: {
        logger.step('**********', workflowStepConstants.revokeSessionVerifyTransaction);
        require(rootPrefix + '/lib/session/VerifyRevoke');
        const VerifyRevokeSessionTransaction = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'VerifyRevokeSessionTransaction'
          ),
          verifyRevokeSessionTransactionObj = new VerifyRevokeSessionTransaction(oThis.requestParams);

        return verifyRevokeSessionTransactionObj.perform();
      }

      case workflowStepConstants.rollbackRevokeSessionTransaction: {
        logger.step('**********', workflowStepConstants.rollbackRevokeSessionTransaction);
        require(rootPrefix + '/lib/session/RollbackRevokeSession');
        const RollbackRevokeSessionTransaction = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'RollbackRevokeSession'
          ),
          rollbackRevokeSessionTransactionObj = new RollbackRevokeSessionTransaction(oThis.requestParams);

        return rollbackRevokeSessionTransactionObj.perform();
      }

      case workflowStepConstants.markSuccess: {
        logger.step('*** Mark Revoke Session As Success.');

        const preProcessorWebhookDetails = oThis.preProcessorWebhookDetails(true);

        await oThis.sendPreprocessorWebhook(preProcessorWebhookDetails.chainId, preProcessorWebhookDetails.payload);

        return await oThis.handleSuccess();
      }

      case workflowStepConstants.markFailure: {
        logger.step('*** Mark Revoke Session As Failed');

        return await oThis.handleFailure();
      }
      default: {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'e_awr_mo_rsr_1',
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
    return revokeSessionStepsConfig[nextStep];
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

  /**
   * Get preprocessor webhook details.
   *
   * @param {boolean} status: true for success, false for failure.
   *
   * @returns {{chainId: string, payload: {webhookKind: string, clientId: string, sessionKey: string, userId: string}}}
   */
  preProcessorWebhookDetails(status) {
    const oThis = this;

    return {
      chainId: oThis.requestParams.auxChainId,
      payload: {
        webhookKind: status
          ? webhookSubscriptionsConstants.sessionsRevokedTopic
          : webhookSubscriptionsConstants.sessionsRevokedTopic,
        clientId: oThis.requestParams.clientId,
        userId: oThis.requestParams.userId,
        sessionKey: oThis.requestParams.sessionKey
      }
    };
  }
}

module.exports = RevokeSessionRouter;
