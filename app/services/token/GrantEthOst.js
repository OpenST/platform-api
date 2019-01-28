'use strict';
/**
 * This service grants eth and ost.
 *
 * @module app/services/token/GrantEthOs
 */
const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  workflowTopicConstant = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  GrantEthOstRouter = require(rootPrefix + '/executables/workflowRouter/GrantEthOstRouter');

/**
 * Class for granting eth and ost.
 *
 * @class
 */
class GrantEthOst {
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
    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.address = params.address;
  }

  /**
   * perform
   * @return {Promise<>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('app/services/token/GrantEthOst::perform::catch');
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 's_t_geo_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * Async perform
   *
   * @return {Promise<any>}
   */
  async asyncPerform() {
    const oThis = this;

    return await oThis.startGranting();
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
        originChainId: oThis.originChainId,
        address: oThis.address,
        clientId: oThis.clientId
      }
    };

    let grantEthOstRouter = new GrantEthOstRouter(paramsForGrantEthOstRouter);

    return await grantEthOstRouter.perform();
  }
}

module.exports = GrantEthOst;
