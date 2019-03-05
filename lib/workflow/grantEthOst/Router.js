'use strict';
/**
 * Grant eth and ost router
 *
 * @module lib/workflow/grantEthOst/Router
 */

const rootPrefix = '../../..',
  GrantOst = require(rootPrefix + '/lib/setup/grant/Ost'),
  GrantEth = require(rootPrefix + '/lib/setup/grant/Eth'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  rabbitmqConstants = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  WorkflowStepsModel = require(rootPrefix + '/app/models/mysql/WorkflowStep'),
  WorkflowRouterBase = require(rootPrefix + '/lib/workflow/RouterBase'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  grantEthOstStepsConfig = require(rootPrefix + '/lib/workflow/grantEthOst/stepsConfig'),
  VerifyTransactionStatus = require(rootPrefix + '/lib/setup/economy/VerifyTransactionStatus');

/**
 * Class for GrantEthOst router.
 *
 * @class
 */
class GrantEthOstRouter extends WorkflowRouterBase {
  /**
   * Constructor for GrantEthOst router.
   *
   * @augments GrantEthOstRouter
   *
   * @constructor
   */
  constructor(params) {
    params['workflowKind'] = workflowConstants.grantEthOstKind; // Assign workflowKind.
    super(params);

    const oThis = this;
  }

  /**
   * Fetch current step config for every router.
   *
   * @private
   */
  _fetchCurrentStepConfig() {
    const oThis = this;

    oThis.currentStepConfig = grantEthOstStepsConfig[oThis.stepKind];
  }

  /**
   * Rabbitmq kind to which after receipt params to be published
   *
   * @private
   */
  get _rabbitmqKind() {
    return rabbitmqConstants.globalRabbitmqKind;
  }

  /**
   * Get next step configs.
   *
   * @param nextStep
   *
   * @return {*}
   */
  getNextStepConfigs(nextStep) {
    return grantEthOstStepsConfig[nextStep];
  }

  /**
   * Get transaction hash for given kind
   *
   * @param {String} kindStr
   *
   * @return {*}
   */
  getTransactionHashForKind(kindStr) {
    const oThis = this,
      kindInt = +new WorkflowStepsModel().invertedKinds[kindStr];

    for (let workflowKind in oThis.workflowStepKindToRecordMap) {
      let workflowData = oThis.workflowStepKindToRecordMap[workflowKind];

      if (workflowData.kind === kindInt) {
        return workflowData.transaction_hash;
      }
    }

    return '';
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

    oThis.requestParams.pendingTransactionExtraData = oThis._currentStepPayloadForPendingTrx();
    oThis.address = oThis.requestParams.address;
    oThis.originChainId = oThis.requestParams.originChainId;

    switch (oThis.stepKind) {
      case workflowStepConstants.grantEthOstInit:
        logger.step('******** Grant Eth and Ost Init ******');
        return oThis.insertInitStep();

      case workflowStepConstants.grantEth:
        logger.step('******** Grant Eth ********');
        return new GrantEth({
          originChainId: oThis.requestParams.originChainId,
          toAddress: oThis.requestParams.address,
          clientId: oThis.requestParams.clientId,
          pendingTransactionExtraData: oThis.requestParams.pendingTransactionExtraData
        }).perform();

      case workflowStepConstants.verifyGrantEth:
        logger.step('******* Verify Eth Grant *********');

        return new VerifyTransactionStatus({
          transactionHash: oThis.getTransactionHashForKind(workflowStepConstants.grantEth),
          chainId: oThis.requestParams.originChainId
        }).perform();

      case workflowStepConstants.grantOst:
        logger.step('******** Grant Ost ********');
        return new GrantOst({
          originChainId: oThis.requestParams.originChainId,
          toAddress: oThis.requestParams.address,
          clientId: oThis.requestParams.clientId,
          pendingTransactionExtraData: oThis.requestParams.pendingTransactionExtraData
        }).perform();

      case workflowStepConstants.verifyGrantOst:
        logger.step('******* Verify OST Grant *********');

        return new VerifyTransactionStatus({
          transactionHash: oThis.getTransactionHashForKind(workflowStepConstants.grantOst),
          chainId: oThis.requestParams.originChainId
        }).perform();

      case workflowStepConstants.markSuccess:
        logger.step('*** Mark Grant Eth and Ost As Success');

        return oThis.handleSuccess();

      case workflowStepConstants.markFailure:
        logger.step('*** Mark Grant Eth and Ost As Failed');

        return oThis.handleFailure();

      default:
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'e_wr_geor_1',
            api_error_identifier: 'something_went_wrong',
            debug_options: { workflowId: oThis.workflowId }
          })
        );
    }
  }
}

module.exports = GrantEthOstRouter;
