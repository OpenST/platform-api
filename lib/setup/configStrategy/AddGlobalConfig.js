'use strict';

/**
 * Base klass to setup global config strategy
 *
 * @module lib/setup/configStrategy/AddGlobalConfig
 */
const rootPrefix = '../../..',
  Base = require(rootPrefix + '/lib/setup/configStrategy/Base'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

/**
 * Class for global config strategy
 *
 * @class
 */
class AddGlobalConfig extends Base {
  /**
   * Constructor
   *
   * @constructor
   */
  constructor(configFilePath) {
    super(configFilePath);

    const oThis = this;
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

    logger.step('** Get encryption salt id for config strategy');
    let response = await oThis._getEncryptionSaltId();
    logger.step(response);
    if (!response.id || response.id <= 0) {
      return oThis._getRespError('l_s_cs_agc_2');
    }
    oThis.encryptionSaltId = response.id;

    for (let kind in oThis.config) {
      let config = {};
      config[kind] = oThis.config[kind];
      await oThis._addConfig(kind, config);
    }
  }
}

module.exports = AddGlobalConfig;
