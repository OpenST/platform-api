'use strict';

/**
 * Base klass to setup config strategy
 *
 * @module lib/setup/configStrategy/Base
 */
const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  KmsWrapper = require(rootPrefix + '/lib/authentication/KmsWrapper'),
  encryptionSaltConst = require(rootPrefix + '/lib/globalConstant/encryptionSalt'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  EncryptionSaltModel = require(rootPrefix + '/app/models/mysql/EncryptionSalt'),
  ConfigStrategyCrud = require(rootPrefix + '/helpers/configStrategy/ByChainId');

/**
 * Class for config strategy base
 *
 * @class
 */
class Base {
  /**
   * Constructor
   *
   * @param configFilePath
   *
   * @constructor
   */
  constructor(configFilePath) {
    const oThis = this;

    let configData = require(configFilePath);

    oThis.config = configData.config;
    oThis.chainId = configData.chainId;
    oThis.groupId = configData.groupId;

    // Will be populated later on
    oThis.encryptionSaltId = 0;
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
        logger.error('lib/setup/configStrategy/Base.js::perform::catch', error);
        return oThis._getRespError('l_s_cs_b_1');
      }
    });
  }

  /**
   * Add Config Strategy
   *
   * @param kind - Config kind
   * @param config - config JSON
   *
   * @returns {Promise<*>}
   * @private
   */
  async _addConfig(kind, config) {
    const oThis = this;
    logger.step(`** Adding entry for ${kind} in config startegy`);
    let serviceObj = new ConfigStrategyCrud(oThis.chainId, oThis.groupId);
    return serviceObj.addForKind(kind, config, oThis.encryptionSaltId);
  }

  /**
   * Generate config strategy encryption salt
   *
   * @returns {Promise<void>}
   * @private
   */
  async _getEncryptionSaltId() {
    const oThis = this;

    const client_id = 0,
      kind = encryptionSaltConst.invertedKinds[encryptionSaltConst.configStrategyKind];

    let response = await new EncryptionSaltModel().getByClientIdAndKind(client_id, kind);

    if (!response[0]) {
      const KMSObject = new KmsWrapper('knownAddresses');

      return KMSObject.generateDataKey().then(async function(a) {
        const addressSalt = a['CiphertextBlob'];

        let insertedRec = await new EncryptionSaltModel()
          .insert({
            client_id: client_id,
            kind: kind,
            salt: addressSalt
          })
          .fire();

        return { id: insertedRec.insertId };
      });
    } else {
      return { id: response[0].id };
    }
  }

  /**
   * Generate Error response
   *
   * @param code {String} - Error internal identifier
   *
   * @returns {Promise<void>}
   * @private
   */
  async _getRespError(code) {
    const oThis = this;

    return responseHelper.error({
      internal_error_identifier: code,
      api_error_identifier: 'something_went_wrong',
      debug_options: {}
    });
  }
}

module.exports = Base;
