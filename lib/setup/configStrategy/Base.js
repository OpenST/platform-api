/**
 * Module to setup config strategy.
 *
 * @module lib/setup/configStrategy/Base
 */
const rootPrefix = '../../..',
  EncryptionSaltModel = require(rootPrefix + '/app/models/mysql/EncryptionSalt'),
  ConfigStrategyCrud = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  ConfigStrategyModel = require(rootPrefix + '/app/models/mysql/ConfigStrategy'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  KmsWrapper = require(rootPrefix + '/lib/authentication/KmsWrapper'),
  encryptionSaltConst = require(rootPrefix + '/lib/globalConstant/encryptionSalt');

/**
 * Class to setup config strategy.
 *
 * @class Base
 */
class Base {
  /**
   * Constructor to setup config strategy.
   *
   * @param {string} configFilePath
   *
   * @constructor
   */
  constructor(configFilePath) {
    const oThis = this;

    const configData = require(configFilePath);

    oThis.config = configData.config;
    oThis.chainId = configData.chainId;
    oThis.groupId = configData.groupId;

    // Will be populated later on
    oThis.encryptionSaltId = 0;
  }

  /**
   * Main performer for class.
   *
   * @return {Promise<result>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      }
      logger.error('lib/setup/configStrategy/Base.js::perform::catch', error);

      return oThis._getRespError('l_s_cs_b_1');
    });
  }

  /**
   * Add Config Strategy.
   *
   * @param {string} kind: Config kind
   * @param {string} config: config JSON
   *
   * @returns {Promise<*>}
   * @private
   */
  async _addConfig(kind, config) {
    const oThis = this;

    logger.step(`** Adding entry for ${kind} in config startegy`);
    const serviceObj = new ConfigStrategyCrud(oThis.chainId, oThis.groupId);

    return serviceObj.addForKind(kind, config, oThis.encryptionSaltId);
  }

  /**
   * Generate config strategy encryption salt.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _getEncryptionSaltId() {
    const token_id = 0,
      kind = encryptionSaltConst.invertedKinds[encryptionSaltConst.configStrategyKind];

    const response = await new EncryptionSaltModel().getByTokenIdAndKind(token_id, kind);

    if (!response[0]) {
      const KMSObject = new KmsWrapper(ConfigStrategyModel.encryptionPurpose);

      return KMSObject.generateDataKey().then(async function(response) {
        const addressSalt = response.CiphertextBlob;

        const insertedRec = await new EncryptionSaltModel()
          .insert({
            token_id: token_id,
            kind: kind,
            salt: addressSalt
          })
          .fire();

        return { id: insertedRec.insertId };
      });
    }

    return { id: response[0].id };
  }

  /**
   * Generate Error response.
   *
   * @param {string} code: Error internal identifier
   *
   * @returns {Promise<void>}
   * @private
   */
  async _getRespError(code) {
    return responseHelper.error({
      internal_error_identifier: code,
      api_error_identifier: 'something_went_wrong',
      debug_options: {}
    });
  }

  /**
   * Generate empty success response.
   *
   * @returns {object}
   * @private
   */
  async _getRespSuccess() {
    return responseHelper.successWithData({});
  }
}

module.exports = Base;
