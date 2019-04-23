'use strict';
/**
 * Update Price Point router.
 *
 * @module lib/workflow/updatePricePoints/Router
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  AuxWorkflowRouterBase = require(rootPrefix + '/lib/workflow/AuxRouterBase'),
  updatePricePointStepsConfig = require(rootPrefix + '/lib/workflow/updatePricePoints/stepsConfig'),
  VerifySetPriceInPriceOracleContract = require(rootPrefix +
    '/lib/updatePricePoints/VerifySetPriceInPriceOracleContract');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/updatePricePoints/FetchPricePointFromCoinMarketCapApi');
require(rootPrefix + '/lib/updatePricePoints/SetPriceInPriceOracleContract');

/**
 * Class for Update Price Point router.
 *
 * @class
 */
class UpdatePricePointsRouter extends AuxWorkflowRouterBase {
  /**
   * Constructor for Update Price Points router.
   *
   * @constructor
   */
  constructor(params) {
    params['workflowKind'] = workflowConstants.updatePricePointKind; // Assign workflowKind.

    super(params);
  }

  /**
   * Fetch current step config for every router.
   *
   * @private
   */
  _fetchCurrentStepConfig() {
    const oThis = this;

    oThis.currentStepConfig = updatePricePointStepsConfig[oThis.stepKind];
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

    oThis.requestParams.pendingTransactionExtraData = oThis._currentStepPayloadForPendingTrx();

    switch (oThis.stepKind) {
      case workflowStepConstants.updatePricePointInit:
        return oThis.insertInitStep();

      // Fetch Price Point From CoinMarketCap Api
      case workflowStepConstants.fetchPricePointFromCoinMarketCapApi:
        const FetchPricePointFromCoinMarketCapApi = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'FetchPricePointFromCoinMarketCapApi'
          ),
          fetchPricePointFromCoinMarketCapApiObj = new FetchPricePointFromCoinMarketCapApi(oThis.requestParams);

        return fetchPricePointFromCoinMarketCapApiObj.perform();

      // Set Price In PriceOracle Contract
      case workflowStepConstants.setPriceInPriceOracleContract:
        const SetPriceInPriceOracleContractKlass = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'SetPriceInPriceOracleContract'
          ),
          setPriceInPriceOracleContractObj = new SetPriceInPriceOracleContractKlass(oThis.requestParams);

        return setPriceInPriceOracleContractObj.perform();

      // Verify Set Price In PriceOracle Contract
      case workflowStepConstants.verifySetPriceInPriceOracleContract:
        return new VerifySetPriceInPriceOracleContract(oThis.requestParams).perform();

      case workflowStepConstants.markSuccess:
        logger.step('*** Mark Update Price Point As Success.');

        return await oThis.handleSuccess();

      case workflowStepConstants.markFailure:
        logger.step('*** Mark Update Price Point As Failed');

        return await oThis.handleFailure();

      default:
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'e_awr_upp_1',
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
    return updatePricePointStepsConfig[nextStep];
  }

  /**
   * Get config strategy.
   *
   * @return {Promise<*>}
   */
  async getConfigStrategy() {
    const oThis = this;

    const response = await chainConfigProvider.getFor([oThis.chainId]);

    return response[oThis.chainId];
  }
}

module.exports = UpdatePricePointsRouter;
