/**
 * Module for update price point router.
 *
 * @module lib/workflow/updatePricePoints/Router
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
  updatePricePointStepsConfig = require(rootPrefix + '/lib/workflow/updatePricePoints/stepsConfig');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/updatePricePoints/FetchPricePointFromCoinMarketCapApi');
require(rootPrefix + '/lib/updatePricePoints/SetPriceInPriceOracleContract');
require(rootPrefix + '/lib/updatePricePoints/VerifySetPriceInPriceOracleContract');

/**
 * Class for update price point router.
 *
 * @class UpdatePricePointsRouter
 */
class UpdatePricePointsRouter extends AuxWorkflowRouterBase {
  /**
   * Constructor for update price point router.
   *
   * @param {object} params
   *
   * @augments AuxWorkflowRouterBase
   *
   * @constructor
   */
  constructor(params) {
    params.workflowKind = workflowConstants.updatePricePointKind; // Assign workflowKind.

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

    oThis.currentStepConfig = updatePricePointStepsConfig[oThis.stepKind];
  }

  /**
   * Perform step.
   *
   * @sets oThis.requestParams.pendingTransactionExtraData
   *
   * @return {Promise<*>}
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

      // Fetch price point from CoinMarketCap Api.
      case workflowStepConstants.fetchPricePointFromCoinMarketCapApi: {
        const FetchPricePointFromCoinMarketCapApi = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'FetchPricePointFromCoinMarketCapApi'
          ),
          fetchPricePointFromCoinMarketCapApiObj = new FetchPricePointFromCoinMarketCapApi(oThis.requestParams);

        return fetchPricePointFromCoinMarketCapApiObj.perform();
      }

      // Set price in PriceOracle contract.
      case workflowStepConstants.setPriceInPriceOracleContract: {
        const SetPriceInPriceOracleContractKlass = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'SetPriceInPriceOracleContract'
          ),
          setPriceInPriceOracleContractObj = new SetPriceInPriceOracleContractKlass(oThis.requestParams);

        return setPriceInPriceOracleContractObj.perform();
      }

      // Verify set price in PriceOracle contract.
      case workflowStepConstants.verifySetPriceInPriceOracleContract: {
        const VerifySetPriceInPriceOracleContract = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'VerifySetPriceInPriceOracleContract'
          ),
          verifySetPriceInPriceOracleContract = new VerifySetPriceInPriceOracleContract(oThis.requestParams);

        return verifySetPriceInPriceOracleContract.perform();
      }

      case workflowStepConstants.markSuccess:
        logger.step('*** Mark Update Price Point As Success.');

        return oThis.handleSuccess();

      case workflowStepConstants.markFailure:
        logger.step('*** Mark Update Price Point As Failed.');

        return oThis.handleFailure();

      default:
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'l_w_upp_1',
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
