'use strict';
/**
 * Grant eth and ost router
 *
 * @module executables/workflowRouter/EconomySetupRouter
 */

const rootPrefix = '../..',
  GrantOst = require(rootPrefix + '/lib/fund/ost/GrantOst'),
  GrantEth = require(rootPrefix + '/lib/fund/eth/GrantEth'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  WorkflowRouterBase = require(rootPrefix + '/executables/workflowRouter/Base'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  grantEthOstConfig = require(rootPrefix + '/executables/workflowRouter/grantEthOstConfig');

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
    oThis.address = params.address;
    oThis.originChainId = params.originChainId;
  }

  /**
   * Fetch current step config for every router.
   *
   * @private
   */
  _fetchCurrentStepConfig() {
    const oThis = this;

    oThis.currentStepConfig = grantEthOstConfig[oThis.stepKind];
  }

  /**
   * Get next step configs.
   *
   * @param nextStep
   *
   * @return {*}
   */
  getNextStepConfigs(nextStep) {
    return grantEthOstConfig[nextStep];
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

    switch (oThis.stepKind) {
      case workflowStepConstants.grantEthOstInit:
        logger.step('******** Grant Eth and Ost Init ******');
        return oThis.insertInitStep();

      case workflowStepConstants.grantEth:
        logger.step('******** Grant Eth ********');
        return await new GrantEth({
          originChainId: oThis.requestParams.originChainId,
          address: oThis.requestParams.address,
          clientId: oThis.requestParams.clientId
        }).perform();

      case workflowStepConstants.grantOst:
        logger.step('******** Grant Ost ********');
        return await new GrantOst({
          originChainId: oThis.requestParams.originChainId,
          address: oThis.requestParams.address,
          clientId: oThis.requestParams.clientId
        }).perform();

      case workflowStepConstants.markSuccess:
        logger.step('*** Mark Grant Eth and Ost As Success');

        return await oThis.handleSuccess();

      case workflowStepConstants.markFailure:
        logger.step('*** Mark Grant Eth and Ost As Failed');

        return await oThis.handleFailure();

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
