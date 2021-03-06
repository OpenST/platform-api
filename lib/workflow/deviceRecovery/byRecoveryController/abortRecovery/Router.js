/**
 * Module for abort recovery by recovery controller router.
 *
 * @module lib/workflow/deviceRecovery/byRecoveryController/abortRecovery/Router
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../../..',
  AuxWorkflowRouterBase = require(rootPrefix + '/lib/workflow/AuxRouterBase'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  webhookSubscriptionsConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions'),
  abortRecoveryConfig = require(rootPrefix +
    '/lib/workflow/deviceRecovery/byRecoveryController/abortRecovery/stepsConfig');

/**
 * Class for abort recovery by recovery controller router.
 *
 * @class AbortRecoveryRouter
 */
class AbortRecoveryRouter extends AuxWorkflowRouterBase {
  /**
   * Constructor for abort recovery by recovery controller router.
   *
   * @augments AuxWorkflowRouterBase
   *
   * @constructor
   */
  constructor(params) {
    params.workflowKind = workflowConstants.abortRecoveryByRecoveryControllerKind; // Assign workflowKind.

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

    oThis.currentStepConfig = abortRecoveryConfig[oThis.stepKind];
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
      case workflowStepConstants.abortRecoveryByRecoveryControllerInit: {
        logger.step('**********', workflowStepConstants.abortRecoveryByRecoveryControllerInit);

        return oThis.insertInitStep();
      }

      // Perform transaction to abort recovery.
      case workflowStepConstants.abortRecoveryByRecoveryControllerPerformTransaction: {
        logger.step('**********', workflowStepConstants.abortRecoveryByRecoveryControllerPerformTransaction);

        require(rootPrefix + '/lib/deviceRecovery/byRecoveryController/abortRecovery/PerformTransaction');

        oThis.requestParams.pendingTransactionExtraData = oThis._currentStepPayloadForPendingTrx();
        oThis.requestParams.workflowId = oThis.workflowId;

        const PerformAbortRecoveryByRecoveryControllerTransaction = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'PerformAbortRecoveryByRecoveryControllerTransaction'
          ),
          performAbortRecoveryByRecoveryControllerTransactionObj = new PerformAbortRecoveryByRecoveryControllerTransaction(
            oThis.requestParams
          );

        return performAbortRecoveryByRecoveryControllerTransactionObj.perform();
      }

      // Verify abort recovery transaction.
      case workflowStepConstants.abortRecoveryByRecoveryControllerVerifyTransaction: {
        logger.step('**********', workflowStepConstants.abortRecoveryByRecoveryControllerVerifyTransaction);

        require(rootPrefix + '/lib/deviceRecovery/byRecoveryController/abortRecovery/VerifyTransaction');

        const VerifyAbortRecoveryByRecoveryControllerTransaction = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'VerifyAbortRecoveryByRecoveryControllerTransaction'
          ),
          verifyAbortRecoveryByRecoveryControllerTransactionObj = new VerifyAbortRecoveryByRecoveryControllerTransaction(
            oThis.requestParams
          );

        return verifyAbortRecoveryByRecoveryControllerTransactionObj.perform();
      }

      case workflowStepConstants.markSuccess: {
        logger.step('*** Mark Abort Recovery As Success.');

        const preProcessorWebhookDetails = oThis.preProcessorWebhookDetails(true);

        await oThis.sendPreprocessorWebhook(preProcessorWebhookDetails.chainId, preProcessorWebhookDetails.payload);

        return await oThis.handleSuccess();
      }

      case workflowStepConstants.markFailure: {
        logger.step('*** Mark Abort Recovery As Failed');

        const preProcessorWebhookDetails = oThis.preProcessorWebhookDetails(false);

        await oThis.sendPreprocessorWebhook(preProcessorWebhookDetails.chainId, preProcessorWebhookDetails.payload);

        return await oThis.handleFailure();
      }

      default: {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'l_w_dr_brc_ar_r_1',
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
    return abortRecoveryConfig[nextStep];
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
   * @returns {{chainId: string, payload: {webhookKind: string, clientId: string, tokenId: string,
   *            oldDeviceAddress: string, newDeviceAddress: string, userId: string}}}
   */
  preProcessorWebhookDetails(status) {
    const oThis = this;

    return {
      chainId: oThis.requestParams.auxChainId,
      payload: {
        webhookKind: status
          ? webhookSubscriptionsConstants.devicesRecoveryAbortSuccessTopic
          : webhookSubscriptionsConstants.devicesRecoveryAbortFailureTopic,
        clientId: oThis.requestParams.clientId,
        tokenId: oThis.requestParams.tokenId,
        userId: oThis.requestParams.userId,
        oldDeviceAddress: oThis.requestParams.oldDeviceAddress,
        newDeviceAddress: oThis.requestParams.newDeviceAddress
      }
    };
  }
}

module.exports = AbortRecoveryRouter;
