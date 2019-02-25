'use strict';
/**
 * Authorize Session Router
 *
 * @module lib/workflow/authorizeSession/Router
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  AuxWorkflowRouterBase = require(rootPrefix + '/lib/workflow/AuxRouterBase'),
  authorizeSessionStepsConfig = require(rootPrefix + '/lib/workflow/authorizeSession/stepsConfig');

/**
 *
 *
 * @class
 */
class AuthorizeSessionRouter extends AuxWorkflowRouterBase {
  /**
   * Constructor for User Setup router.
   *
   * @constructor
   */
  constructor(params) {
    params['workflowKind'] = workflowConstants.authorizeSessionKind; // Assign workflowKind.
    super(params);
  }

  /**
   * Fetch current step config for every router.
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
   *
   * @private
   */
  async _performStep() {
    const oThis = this;

    const configStrategy = await oThis.getConfigStrategy(),
      ic = new InstanceComposer(configStrategy);

    switch (oThis.stepKind) {
      case workflowStepConstants.authorizeSessionInit:
        logger.step('**********', workflowStepConstants.authorizeSessionInit);
        return oThis.insertInitStep();

      // Add Session addresses
      case workflowStepConstants.authorizeSessionPerformTransaction:
        logger.step('**********', workflowStepConstants.authorizeSessionPerformTransaction);
        require(rootPrefix + '/lib/session/Authorize');
        oThis.requestParams.pendingTransactionExtraData = oThis._currentStepPayloadForPendingTrx();
        let AuthorizeSessionPerformTransaction = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'AuthorizeSessionPerformTransaction'
          ),
          authorizeSessionPerformTransactionObj = new AuthorizeSessionPerformTransaction(oThis.requestParams);

        return authorizeSessionPerformTransactionObj.perform();

      // Add user in User wallet factory.
      case workflowStepConstants.authorizeSessionVerifyTransaction:
        logger.step('**********', workflowStepConstants.authorizeSessionVerifyTransaction);
        require(rootPrefix + '/lib/session/VerifyAuthorize');
        let VerifyAuthorizeSessionTransaction = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'VerifyAuthorizeSessionTransaction'
          ),
          verifyAuthorizeSessionTransactionObj = new VerifyAuthorizeSessionTransaction(oThis.requestParams);

        return verifyAuthorizeSessionTransactionObj.perform();
      case workflowStepConstants.rollbackAuthorizeSessionTransaction:
        logger.step('**********', workflowStepConstants.rollbackAuthorizeSessionTransaction);
        require(rootPrefix + '/lib/session/RollBackAuthorizeSession');
        let RollbackAuthorizeSessionTransaction = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'RollbackAuthorizeSession'
          ),
          rollbackAuthorizeSessionTransactionObj = new RollbackAuthorizeSessionTransaction(oThis.requestParams);

        return rollbackAuthorizeSessionTransactionObj.perform();

      case workflowStepConstants.markSuccess:
        logger.step('*** Mark Authorize Session As Success.');

        return await oThis.handleSuccess();

      case workflowStepConstants.markFailure:
        logger.step('*** Mark Authorize Session As Failed');

        return await oThis.handleFailure();

      default:
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'e_awr_mo_asr_1',
            api_error_identifier: 'something_went_wrong',
            debug_options: { workflowId: oThis.workflowId }
          })
        );
    }
  }

  /**
   * Get next step configs.
   *
   * @param nextStep
   *
   * @return {*}
   */
  getNextStepConfigs(nextStep) {
    return authorizeSessionStepsConfig[nextStep];
  }

  /**
   * Get config strategy.
   *
   * @return {Promise<*>}
   */
  async getConfigStrategy() {
    const oThis = this;

    let rsp = await chainConfigProvider.getFor([oThis.chainId]);

    return rsp[oThis.chainId];
  }
}

module.exports = AuthorizeSessionRouter;
