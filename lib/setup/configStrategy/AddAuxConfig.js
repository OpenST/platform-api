'use strict';

/**
 * Base klass to setup aux config strategy
 *
 * @module lib/setup/configStrategy/AddAuxConfig
 */
const rootPrefix = '../../..',
  Base = require(rootPrefix + '/lib/setup/configStrategy/Base'),
  ConfigGroupsModel = require(rootPrefix + '/app/models/mysql/ConfigGroup'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

/**
 * Class for aux config strategy
 *
 * @class
 */
class AddAuxConfig extends Base {
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
    if (!response.id || response.id <= 0) {
      return oThis._getRespError('l_s_cs_aac_2');
    }
    oThis.encryptionSaltId = response.id;

    let configGroupResp = await oThis._getOrCreateConfigGroup();
    if (!configGroupResp) {
      return oThis._getRespError('l_s_cs_aac_3');
    }

    for (let kind in oThis.config) {
      let config = {};
      config[kind] = oThis.config[kind];
      await oThis._addConfig(kind, config);
    }

    return oThis._getRespSuccess();
  }

  /**
   * Create config group
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _getOrCreateConfigGroup() {
    const oThis = this;

    let configGroupsObject = new ConfigGroupsModel();
    let getResp = await configGroupsObject.getByChainIdAndGroupId(oThis.chainId, oThis.groupId);

    if (!getResp[0]) {
      let configGroupsObject = new ConfigGroupsModel();
      return await configGroupsObject
        .insertRecord({ chainId: oThis.chainId, groupId: oThis.groupId })
        .then(function(data) {
          return true;
        })
        .catch(function(err) {
          logger.error('lib/setup/configStrategy/AddAuxConfig.js::_getOrCreateConfigGroup::catch', err);
          return false;
        });
    }

    return true;
  }
}

module.exports = AddAuxConfig;
