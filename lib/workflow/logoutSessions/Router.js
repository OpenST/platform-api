'use strict';
/**
 * Logout Session Router
 *
 * @module lib/workflow/logoutSessions/Router
 */
const OSTBase = require('@ostdotcom/base');

const rootPrefix = '../../..',
  AuxWorkflowRouterBase = require(rootPrefix + '/lib/workflow/AuxRouterBase'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  logoutSessionsStepsConfig = require(rootPrefix + '/lib/workflow/logoutSessions/stepsConfig');

const InstanceComposer = OSTBase.InstanceComposer;

/**
 *
 *
 * @class
 */
class LogoutSessionsRouter extends AuxWorkflowRouterBase {
  /**
   * Constructor for User Setup router.
   *
   * @constructor
   */
  constructor(params) {
    params['workflowKind'] = workflowConstants.logoutSessionsKind; // Assign workflowKind.
    super(params);
  }

  /**
   * Fetch current step config for every router.
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
   *
   * @private
   */
  async _performStep() {
    const oThis = this;

    const configStrategy = await oThis.getConfigStrategy(),
      ic = new InstanceComposer(configStrategy);

    switch (oThis.stepKind) {
      case workflowStepConstants.logoutSessionInit:
        logger.step('********** ', workflowStepConstants.logoutSessionInit);
        return oThis.insertInitStep();

      case workflowStepConstants.logoutSessionPerformTransaction:
        logger.step('********** ', workflowStepConstants.logoutSessionPerformTransaction);

        require(rootPrefix + '/lib/session/multisigOperation/Logout');

        oThis.requestParams.pendingTransactionExtraData = oThis._currentStepPayloadForPendingTrx();
        let logoutSessionPerformTransaction = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'LogoutSessionPerformTransaction'
          ),
          logoutSessionPerformTransactionObj = new logoutSessionPerformTransaction(oThis.requestParams);

        return logoutSessionPerformTransactionObj.perform();

      case workflowStepConstants.logoutSessionVerifyTransaction:
        logger.step('********** ', workflowStepConstants.logoutSessionVerifyTransaction);

        require(rootPrefix + '/lib/session/VerifyLogout');

        let VerifyLogoutSessionTransaction = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'VerifyLogoutSessionTransaction'
          ),
          verifyLogoutSessionTransactionObj = new VerifyLogoutSessionTransaction(oThis.requestParams);

        return verifyLogoutSessionTransactionObj.perform();

      case workflowStepConstants.markSuccess:
        logger.step('*** Mark logout Sessions As Success.');

        return await oThis.handleSuccess();

      case workflowStepConstants.markFailure:
        logger.step('*** Mark logout Sessions As Failed');

        return await oThis.handleFailure();

      default:
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'l_w_ls_r_1',
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
    return logoutSessionsStepsConfig[nextStep];
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

module.exports = LogoutSessionsRouter;
