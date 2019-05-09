'use strict';
/**
 * This service grants eth and ost.
 *
 * @module app/services/token/GrantEthOs
 */
const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  workflowTopicConstant = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  GrantEthOstRouter = require(rootPrefix + '/lib/workflow/grantEthOst/Router');

/**
 * Class for granting eth and ost.
 *
 * @class
 */
class GrantEthStakeCurrency extends ServiceBase {
  /**
   * Constructor for token deployment
   *
   * @param {Object} params
   * @param {Integer} params.client_id
   * @param {String} params.address
   *
   * @constructor
   */
  constructor(params) {
    super();

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.address = params.address;
  }

  /**
   * Async perform
   *
   * @return {Promise<any>}
   */
  async _asyncPerform() {
    const oThis = this;

    if (basicHelper.isMainSubEnvironment()) {
      return responseHelper.error({
        internal_error_identifier: 's_t_geo_1',
        api_error_identifier: 'route_prohibited_in_main',
        debug_options: {}
      });
    }

    await oThis._fetchTokenDetails();

    return oThis.startGranting();
  }

  /**
   * Fetch origin chainId.
   *
   * @return {Promise<void>}
   *
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

    const paramsForGrantEthOstRouter = {
      stepKind: workflowStepConstants.grantEthOstInit,
      taskStatus: workflowStepConstants.taskReadyToStart,
      chainId: oThis.chainId,
      topic: workflowTopicConstant.grantEthOst,
      clientId: oThis.clientId,
      requestParams: {
        tokenId: oThis.tokenId,
        originChainId: oThis.originChainId,
        address: oThis.address,
        clientId: oThis.clientId
      }
    };

    let grantEthOstRouter = new GrantEthOstRouter(paramsForGrantEthOstRouter);

    return grantEthOstRouter.perform();
  }
}

module.exports = GrantEthStakeCurrency;
