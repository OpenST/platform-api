/**
 * Execute recovery router.
 *
 * @module lib/workflow/deviceRecovery/byRecoveryController/executeRecovery/Router
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
  executeRecoveryConfig = require(rootPrefix +
    '/lib/workflow/deviceRecovery/byRecoveryController/executeRecovery/stepsConfig');

/**
 * Class for execute recovery router.
 *
 * @class ExecuteRecoveryRouter
 */
class ExecuteRecoveryRouter extends AuxWorkflowRouterBase {
  /**
   * Constructor for execute recovery router.
   *
   * @augments AuxWorkflowRouterBase
   *
   * @constructor
   */
  constructor(params) {
    params.workflowKind = workflowConstants.executeRecoveryKind; // Assign workflowKind.

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

    oThis.currentStepConfig = executeRecoveryConfig[oThis.stepKind];
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
      case workflowStepConstants.executeRecoveryInit: {
        logger.step('**********', workflowStepConstants.executeRecoveryInit);

        return oThis.insertInitStep();
      }

      // Perform transaction to execute recovery.
      case workflowStepConstants.executeRecoveryPerformTransaction: {
        logger.step('**********', workflowStepConstants.executeRecoveryPerformTransaction);

        require(rootPrefix + '/lib/deviceRecovery/byRecoveryController/executeRecovery/PerformTransaction');

        oThis.requestParams.pendingTransactionExtraData = oThis._currentStepPayloadForPendingTrx();
        oThis.requestParams.workflowId = oThis.workflowId;

        const PerformExecuteRecoveryTransaction = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'PerformExecuteRecoveryTransaction'
          ),
          performExecuteRecoveryTransactionObj = new PerformExecuteRecoveryTransaction(oThis.requestParams);

        return performExecuteRecoveryTransactionObj.perform();
      }

      // Verify execute recovery transaction.
      case workflowStepConstants.executeRecoveryVerifyTransaction: {
        logger.step('**********', workflowStepConstants.executeRecoveryVerifyTransaction);

        require(rootPrefix + '/lib/deviceRecovery/byRecoveryController/executeRecovery/VerifyTransaction');

        const VerifyExecuteRecoveryTransaction = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'VerifyExecuteRecoveryTransaction'
          ),
          verifyExecuteRecoveryTransactionObj = new VerifyExecuteRecoveryTransaction(oThis.requestParams);

        return verifyExecuteRecoveryTransactionObj.perform();
      }
      case workflowStepConstants.markSuccess: {
        logger.step('*** Mark Execute Recovery As Success.');

        const preProcessorWebhookDetails = oThis.preProcessorWebhookDetails(true);

        await oThis.sendPreprocessorWebhook(preProcessorWebhookDetails.chainId, preProcessorWebhookDetails.payload);

        return await oThis.handleSuccess();
      }

      case workflowStepConstants.markFailure: {
        logger.step('*** Mark Execute Recovery As Failed');

        return await oThis.handleFailure();
      }

      default: {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'l_w_dr_brc_er_r_1',
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
    return executeRecoveryConfig[nextStep];
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
   * @returns {{chainId: string, payload: {webhookKind: string, clientId: string, oldDeviceAddress: string,
   *            newDeviceAddress: string, userId: string}}}
   */
  preProcessorWebhookDetails(status) {
    const oThis = this;

    return {
      chainId: oThis.requestParams.auxChainId,
      payload: {
        webhookKind: status
          ? webhookSubscriptionsConstants.devicesRecoverySuccessTopic
          : webhookSubscriptionsConstants.devicesRecoverySuccessTopic,
        clientId: oThis.requestParams.auxChainId,
        userId: oThis.requestParams.userId,
        oldDeviceAddress: oThis.requestParams.oldDeviceAddress,
        newDeviceAddress: oThis.requestParams.newDeviceAddress
      }
    };
  }
}

module.exports = ExecuteRecoveryRouter;
