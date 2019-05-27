/**
 * Module to setup aux config strategy.
 *
 * @module lib/setup/configStrategy/AddAuxConfig
 */

const rootPrefix = '../../..',
  Base = require(rootPrefix + '/lib/setup/configStrategy/Base'),
  ConfigGroupsModel = require(rootPrefix + '/app/models/mysql/ConfigGroup'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

/**
 * Class to setup aux config strategy.
 *
 * @class AddAuxConfig
 */
class AddAuxConfig extends Base {
  /**
   * Constructor
   *
   * @constructor
   */
  constructor(configFilePath) {
    super(configFilePath);
  }

  /**
   * Async perform
   *
   * @return {Promise<result>}
   */
  async _asyncPerform() {
    const oThis = this;

    logger.step('** Get encryption salt id for config strategy');

    const response = await oThis._getEncryptionSaltId();

    if (!response.id || response.id <= 0) {
      return oThis._getRespError('l_s_cs_aac_2');
    }
    oThis.encryptionSaltId = response.id;

    const configGroupResp = await oThis._getOrCreateConfigGroup();
    if (!configGroupResp) {
      return oThis._getRespError('l_s_cs_aac_3');
    }

    for (const kind in oThis.config) {
      const config = {};
      config[kind] = oThis.config[kind];
      await oThis._addConfig(kind, config);
    }

    return oThis._getRespSuccess();
  }

  /**
   * Create config group
   *
   * @returns {Promise<boolean>}
   *
   * @private
   */
  async _getOrCreateConfigGroup() {
    const oThis = this;

    const getResp = await new ConfigGroupsModel().fetchRecord(oThis.chainId, oThis.groupId).catch(function() {
      return null;
    });

    if (!getResp) {
      return new ConfigGroupsModel()
        .insertRecord({ chainId: oThis.chainId, groupId: oThis.groupId })
        .then(function() {
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
