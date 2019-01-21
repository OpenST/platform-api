'use strict';

/**
 * Activate Config strategy for chain
 *
 * @module lib/setup/configStrategy/ActivateConfig
 */
const rootPrefix = '../../..',
  ConfigStrategyCrud = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

/**
 * Class for activate config strategy
 *
 * @class
 */
class ActivateConfig {
  /**
   * Constructor
   *
   * @constructor
   */
  constructor(chainId, groupId) {
    const oThis = this;

    oThis.chainId = chainId;
    oThis.groupId = groupId;
  }

  /**
   *
   * Perform
   *
   * @return {Promise<result>}
   *
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('lib/setup/configStrategy/ActivateConfig.js::perform::catch', error);
        return oThis._getRespError('l_s_cs_ac_1');
      }
    });
  }

  /**
   *
   * async perform
   *
   * @return {Promise<result>}
   *
   */
  async _asyncPerform() {
    const oThis = this;

    logger.step(`** Activating Configs for chain id: ${oThis.chainId} -- group id: ${oThis.groupId}`);

    let csObj = new ConfigStrategyCrud(oThis.chainId, oThis.groupId);
    return await csObj.activate();
  }
}

module.exports = ActivateConfig;
