/**
 * Module for revoke device router.
 *
 * @module lib/workflow/revokeDevice/Router
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
  revokeDeviceStepsConfig = require(rootPrefix + '/lib/workflow/revokeDevice/stepsConfig'),
  webhookSubscriptionsConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions');

/**
 * Class for revoke device router.
 *
 * @class RevokeDeviceRouter
 */
class RevokeDeviceRouter extends AuxWorkflowRouterBase {
  /**
   * Constructor for revoke device router.
   *
   * @augments AuxWorkflowRouterBase
   *
   * @constructor
   */
  constructor(params) {
    params.workflowKind = workflowConstants.revokeDeviceKind; // Assign workflowKind.

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

    oThis.currentStepConfig = revokeDeviceStepsConfig[oThis.stepKind];
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
      case workflowStepConstants.revokeDeviceInit: {
        logger.step('**********', workflowStepConstants.revokeDeviceInit);

        return oThis.insertInitStep();
      }

      // Perform revoke device transaction.
      case workflowStepConstants.revokeDevicePerformTransaction: {
        logger.step('**********', workflowStepConstants.revokeDevicePerformTransaction);
        require(rootPrefix + '/lib/device/Revoke');
        oThis.requestParams.pendingTransactionExtraData = oThis._currentStepPayloadForPendingTrx();
        const RevokeDevicePerformTransaction = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'RevokeDevicePerformTransaction'
          ),
          revokeDevicePerformTransactionObj = new RevokeDevicePerformTransaction(oThis.requestParams);

        return revokeDevicePerformTransactionObj.perform();
      }

      // Verify revoke device transaction.
      case workflowStepConstants.revokeDeviceVerifyTransaction: {
        logger.step('**********', workflowStepConstants.revokeDeviceVerifyTransaction);
        require(rootPrefix + '/lib/device/VerifyRevoke');
        const VerifyRevokeDeviceTransaction = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'VerifyRevokeDeviceTransaction'
          ),
          verifyRevokeDeviceTransactionObj = new VerifyRevokeDeviceTransaction(oThis.requestParams);

        return verifyRevokeDeviceTransactionObj.perform();
      }
      case workflowStepConstants.rollbackRevokeDeviceTransaction: {
        logger.step('**********', workflowStepConstants.rollbackRevokeDeviceTransaction);
        require(rootPrefix + '/lib/device/RollbackRevokeDevice');
        const RollbackRevokeTransaction = ic.getShadowedClassFor(coreConstants.icNameSpace, 'RollbackRevokeDevice'),
          rollbackRevokeTransactionObj = new RollbackRevokeTransaction(oThis.requestParams);

        return rollbackRevokeTransactionObj.perform();
      }

      case workflowStepConstants.markSuccess: {
        logger.step('*** Mark Revoke Device As Success.');

        const preProcessorWebhookDetails = oThis.preProcessorWebhookDetails(true);

        await oThis.sendPreprocessorWebhook(preProcessorWebhookDetails.chainId, preProcessorWebhookDetails.payload);

        return await oThis.handleSuccess();
      }
      case workflowStepConstants.markFailure: {
        logger.step('*** Mark Revoke Device As Failed');

        return await oThis.handleFailure();
      }

      default: {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'e_awr_mo_rdr_1',
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
    return revokeDeviceStepsConfig[nextStep];
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
   * @returns {{chainId: string, payload: {webhookKind: string, deviceAddress: string, clientId: string,
   *            tokenId: string, userId: string}}}
   */
  preProcessorWebhookDetails(status) {
    const oThis = this;

    return {
      chainId: oThis.requestParams.auxChainId,
      payload: {
        webhookKind: status
          ? webhookSubscriptionsConstants.devicesUnauthorizedTopic
          : webhookSubscriptionsConstants.devicesUnauthorizedTopic,
        clientId: oThis.requestParams.clientId,
        tokenId: oThis.requestParams.tokenId,
        userId: oThis.requestParams.userId,
        deviceAddress: oThis.requestParams.deviceAddressToRemove
      }
    };
  }
}

module.exports = RevokeDeviceRouter;
