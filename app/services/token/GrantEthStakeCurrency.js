/**
 * Module to grant eth and stake currency.
 *
 * @module app/services/token/GrantEthStakeCurrency
 */

const rootPrefix = '../../..',
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  GrantEthStakeCurrencyRouter = require(rootPrefix + '/lib/workflow/grantEthStakeCurrency/Router'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  workflowTopicConstant = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

/**
 * Class to grant eth and stake currency.
 *
 * @class GrantEthStakeCurrency
 */
class GrantEthStakeCurrency {
  /**
   * Constructor to grant eth and stake currency.
   *
   * @param {object} params
   * @param {number} params.client_id
   * @param {string} params.address
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.address = params.address;
  }

  /**
   * Main performer of class.
   *
   * @return {Promise<>}
   */
  perform() {
    const oThis = this;

    // TODO - use perform from service base.
    return oThis.asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      }
      logger.error('app/services/token/GrantEthStakeCurrency::perform::catch');
      logger.error(error);

      return responseHelper.error({
        internal_error_identifier: 's_t_gsc_1',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: {}
      });
    });
  }

  /**
   * Async perform.
   *
   * @return {Promise<any>}
   */
  async asyncPerform() {
    const oThis = this;

    if (basicHelper.isMainSubEnvironment()) {
      return responseHelper.error({
        internal_error_identifier: 's_t_gsc_2',
        api_error_identifier: 'route_prohibited_in_main',
        debug_options: {}
      });
    }

    return oThis.startGranting();
  }

  /**
   * Fetch origin chainId.
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchOriginChainId() {
    const oThis = this,
      csHelper = new ConfigStrategyHelper(0),
      csResponse = await csHelper.getForKind(configStrategyConstants.constants),
      configConstants = csResponse.data[configStrategyConstants.constants];

    oThis.originChainId = configConstants.originChainId;
  }

  /**
   * Start the granting procedure.
   *
   * @return {Promise<*>}
   */
  async startGranting() {
    const oThis = this;

    // Fetch origin chainId.
    await oThis._fetchOriginChainId();

    const paramsForGrantEthStakeCurrencyRouter = {
      stepKind: workflowStepConstants.grantEthStakeCurrencyInit,
      taskStatus: workflowStepConstants.taskReadyToStart,
      chainId: oThis.chainId,
      topic: workflowTopicConstant.grantEthStakeCurrency,
      clientId: oThis.clientId,
      requestParams: {
        originChainId: oThis.originChainId,
        address: oThis.address,
        clientId: oThis.clientId
      }
    };

    const grantEthStakeCurrencyRouter = new GrantEthStakeCurrencyRouter(paramsForGrantEthStakeCurrencyRouter);

    return grantEthStakeCurrencyRouter.perform();
  }
}

module.exports = GrantEthStakeCurrency;
