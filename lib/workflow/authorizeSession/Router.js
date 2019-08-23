/**
 * Module for authorize session router.
 *
 * @module lib/workflow/authorizeSession/Router
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  AuxWorkflowRouterBase = require(rootPrefix + '/lib/workflow/AuxRouterBase'),
  util = require(rootPrefix + '/lib/util'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  webhookSubscriptionsConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions'),
  authorizeSessionStepsConfig = require(rootPrefix + '/lib/workflow/authorizeSession/stepsConfig');

/**
 * Class for authorize session router.
 *
 * @class AuthorizeSessionRouter
 */
class AuthorizeSessionRouter extends AuxWorkflowRouterBase {
  /**
   * Constructor for authorize session router.
   *
   * @augments AuxWorkflowRouterBase
   *
   * @constructor
   */
  constructor(params) {
    params.workflowKind = workflowConstants.authorizeSessionKind; // Assign workflowKind.
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

    oThis.currentStepConfig = authorizeSessionStepsConfig[oThis.stepKind];
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
      case workflowStepConstants.authorizeSessionInit: {
        logger.step('**********', workflowStepConstants.authorizeSessionInit);

        return oThis.insertInitStep();
      }

      // Add session addresses.
      case workflowStepConstants.authorizeSessionPerformTransaction: {
        logger.step('**********', workflowStepConstants.authorizeSessionPerformTransaction);
        require(rootPrefix + '/lib/session/multisigOperation/Authorize');
        oThis.requestParams.pendingTransactionExtraData = oThis._currentStepPayloadForPendingTrx();
        const AuthorizeSessionPerformTransaction = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'AuthorizeSessionPerformTransaction'
          ),
          authorizeSessionPerformTransactionObj = new AuthorizeSessionPerformTransaction(oThis.requestParams);

        return authorizeSessionPerformTransactionObj.perform();
      }

      // Verify authorize session transaction.
      case workflowStepConstants.authorizeSessionVerifyTransaction: {
        logger.step('**********', workflowStepConstants.authorizeSessionVerifyTransaction);
        require(rootPrefix + '/lib/session/VerifyAuthorize');
        const VerifyAuthorizeSessionTransaction = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'VerifyAuthorizeSessionTransaction'
          ),
          verifyAuthorizeSessionTransactionObj = new VerifyAuthorizeSessionTransaction(oThis.requestParams);

        return verifyAuthorizeSessionTransactionObj.perform();
      }

      case workflowStepConstants.rollbackAuthorizeSessionTransaction: {
        logger.step('**********', workflowStepConstants.rollbackAuthorizeSessionTransaction);
        require(rootPrefix + '/lib/session/RollBackAuthorizeSession');
        const RollbackAuthorizeSessionTransaction = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'RollbackAuthorizeSession'
          ),
          rollbackAuthorizeSessionTransactionObj = new RollbackAuthorizeSessionTransaction(oThis.requestParams);

        return rollbackAuthorizeSessionTransactionObj.perform();
      }

      case workflowStepConstants.markSuccess: {
        logger.step('*** Mark Authorize Session As Success.');

        const preProcessorWebhookDetails = oThis.preProcessorWebhookDetails(true);

        await oThis.sendPreprocessorWebhook(preProcessorWebhookDetails.chainId, preProcessorWebhookDetails.payload);

        return await oThis.handleSuccess();
      }

      case workflowStepConstants.markFailure: {
        logger.step('*** Mark Authorize Session As Failed');

        const preProcessorWebhookDetails = oThis.preProcessorWebhookDetails(false);

        await oThis.sendPreprocessorWebhook(preProcessorWebhookDetails.chainId, preProcessorWebhookDetails.payload);

        return await oThis.handleFailure();
      }
      default: {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'e_awr_mo_asr_1',
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
    return authorizeSessionStepsConfig[nextStep];
  }

  /**
   * SHA Hash to uniquely identify workflow, to avoid same commits
   *
   * @returns {String}
   *
   * @private
   */
  _uniqueWorkflowHash() {
    const oThis = this;

    let uniqueStr = oThis.requestParams.sessionKey + '_';
    uniqueStr += oThis.requestParams.deviceNonce;

    return util.createSha256Digest(uniqueStr);
  }

  /**
   * Add functionality here that subclass should ensure should happen when error in catch appears.
   *
   * @return {Promise<void>}
   */
  async ensureOnCatch() {
    const oThis = this;

    if (oThis.stepKind === workflowStepConstants.authorizeSessionInit) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_awr_mo_asr_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: { err: 'Workflow failed because of same session nonce.' }
        })
      );
    }
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
          ? webhookSubscriptionsConstants.sessionsAuthorizationSuccessTopic
          : webhookSubscriptionsConstants.sessionsAuthorizationFailureTopic,
        clientId: oThis.requestParams.clientId,
        tokenId: oThis.requestParams.tokenId,
        userId: oThis.requestParams.userId,
        sessionAddress: oThis.requestParams.sessionKey
      }
    };
  }
}

module.exports = AuthorizeSessionRouter;
