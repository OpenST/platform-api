/**
 * Module for grant eth and stake currency router.
 *
 * @module lib/workflow/grantEthStakeCurrency/Router
 */

const rootPrefix = '../../..',
  GrantEth = require(rootPrefix + '/lib/setup/grant/Eth'),
  WorkflowRouterBase = require(rootPrefix + '/lib/workflow/RouterBase'),
  WorkflowStepsModel = require(rootPrefix + '/app/models/mysql/WorkflowStep'),
  GrantStakeCurrency = require(rootPrefix + '/lib/setup/grant/StakeCurrency'),
  VerifyTransactionStatus = require(rootPrefix + '/lib/setup/economy/VerifyTransactionStatus'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  rabbitmqConstants = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  grantEthStakeCurrencyStepsConfig = require(rootPrefix + '/lib/workflow/grantEthStakeCurrency/stepsConfig');

/**
 * Class for grant eth and stake currency router.
 *
 * @class GrantEthStakeCurrencyRouter
 */
class GrantEthStakeCurrencyRouter extends WorkflowRouterBase {
  /**
   * Constructor for grant eth and stake currency router.
   *
   * @param {object} params
   *
   * @augments GrantEthStakeCurrencyRouter
   *
   * @constructor
   */
  constructor(params) {
    params.workflowKind = workflowConstants.grantEthStakeCurrencyKind; // Assign workflowKind.
    super(params);
  }

  /**
   * Fetch current step config for every router.
   *
   * @private
   */
  _fetchCurrentStepConfig() {
    const oThis = this;

    oThis.currentStepConfig = grantEthStakeCurrencyStepsConfig[oThis.stepKind];
  }

  /**
   * Rabbitmq kind to which after receipt params to be published.
   *
   * @private
   */
  get _rabbitmqKind() {
    return rabbitmqConstants.globalRabbitmqKind;
  }

  /**
   * Get next step configs.
   *
   * @param {string} nextStep
   *
   * @return {*}
   */
  getNextStepConfigs(nextStep) {
    return grantEthStakeCurrencyStepsConfig[nextStep];
  }

  /**
   * Get transaction hash for given kind.
   *
   * @param {string} kindStr
   *
   * @return {string}
   */
  getTransactionHashForKind(kindStr) {
    const oThis = this,
      kindInt = +new WorkflowStepsModel().invertedKinds[kindStr];

    for (const workflowKind in oThis.workflowStepKindToRecordMap) {
      const workflowData = oThis.workflowStepKindToRecordMap[workflowKind];

      if (workflowData.kind === kindInt) {
        return workflowData.transaction_hash;
      }
    }

    return '';
  }

  /**
   * Perform step.
   *
   * @sets oThis.requestParams.pendingTransactionExtraData, oThis.address, oThis.originChainId
   *
   * @return {Promise<*>}
   * @private
   */
  async _performStep() {
    const oThis = this;

    oThis.requestParams.pendingTransactionExtraData = oThis._currentStepPayloadForPendingTrx();
    oThis.address = oThis.requestParams.address;
    oThis.originChainId = oThis.requestParams.originChainId;

    switch (oThis.stepKind) {
      case workflowStepConstants.grantEthStakeCurrencyInit:
        logger.step('******** Grant Eth and Stake currency Init ******');

        return oThis.insertInitStep();

      case workflowStepConstants.grantEth:
        logger.step('******** Grant Eth ********');

        return new GrantEth({
          originChainId: oThis.requestParams.originChainId,
          toAddress: oThis.requestParams.address,
          clientId: oThis.requestParams.clientId,
          tokenId: oThis.requestParams.tokenId,
          pendingTransactionExtraData: oThis.requestParams.pendingTransactionExtraData
        }).perform();

      case workflowStepConstants.verifyGrantEth:
        logger.step('******* Verify Eth Grant *********');

        return new VerifyTransactionStatus({
          transactionHash: oThis.getTransactionHashForKind(workflowStepConstants.grantEth),
          chainId: oThis.requestParams.originChainId
        }).perform();

      case workflowStepConstants.grantStakeCurrency:
        logger.step('******** Grant Stake Currency ********');

        return new GrantStakeCurrency({
          originChainId: oThis.requestParams.originChainId,
          toAddress: oThis.requestParams.address,
          clientId: oThis.requestParams.clientId,
          tokenId: oThis.requestParams.tokenId,
          pendingTransactionExtraData: oThis.requestParams.pendingTransactionExtraData
        }).perform();

      case workflowStepConstants.verifyGrantStakeCurrency:
        logger.step('******* Verify Stake Currency Grant *********');

        return new VerifyTransactionStatus({
          transactionHash: oThis.getTransactionHashForKind(workflowStepConstants.grantStakeCurrency),
          chainId: oThis.requestParams.originChainId
        }).perform();

      case workflowStepConstants.markSuccess:
        logger.step('*** Mark Grant Eth and Stake Currency As Success');

        return oThis.handleSuccess();

      case workflowStepConstants.markFailure:
        logger.step('*** Mark Grant Eth and Currency As Failed');

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

module.exports = GrantEthStakeCurrencyRouter;
