/**
 * Module for config strategy table model.
 *
 * @module app/models/mysql/ConfigStrategy
 */

const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  KmsWrapper = require(rootPrefix + '/lib/authentication/KmsWrapper'),
  InMemoryCacheProvider = require(rootPrefix + '/lib/providers/inMemoryCache'),
  EncryptionSaltModel = require(rootPrefix + '/app/models/mysql/EncryptionSalt'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  kms = require(rootPrefix + '/lib/globalConstant/kms'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  localCipher = require(rootPrefix + '/lib/encryptors/localCipher'),
  configValidator = require(rootPrefix + '/helpers/configValidator'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  configStrategyValidator = require(rootPrefix + '/lib/validators/configStrategy'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

const encryptionPurpose = kms.configStrategyPurpose,
  errorConfig = basicHelper.fetchErrorConfig(apiVersions.general),
  dbName = 'config_' + coreConstants.subEnvironment + '_' + coreConstants.environment,
  kinds = configStrategyConstants.kinds,
  invertedKinds = configStrategyConstants.invertedKinds;

/**
 * Class for config strategy table model.
 *
 * @class ConfigStrategyModel
 */
class ConfigStrategyModel extends ModelBase {
  /**
   * Constructor for config strategy table model.
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'config_strategies';
  }

  /**
   * Create record of config strategy.
   *
   * @param {string} kind
   * @param {number} chainId
   * @param {number} groupId
   * @param {object} allParams
   * @param {number} [encryptionSaltId]: presently the id of encryption_salts table
   *
   * @returns {Promise<*>}
   */
  async create(kind, chainId, groupId, allParams, encryptionSaltId) {
    const oThis = this;

    const strategyKindInt = configStrategyValidator.getStrategyKindInt(kind);

    if (encryptionSaltId === undefined) {
      encryptionSaltId = 0;
    }

    await configStrategyValidator.validateChainIdKindCombination(kind, chainId);

    if (!chainId) {
      chainId = 0;
    }

    await configStrategyValidator.validateGroupIdAndChainId(chainId, groupId);

    if (!allParams) {
      return oThis._customError('a_mo_m_cs_5', 'Config Strategy params hash cannot be null');
    }

    // Check if proper keys are present in all params
    if (!configValidator.validateConfigStrategy(kind, allParams)) {
      return oThis._customError('a_mo_m_cs_6', 'Config params validation failed for: ' + JSON.stringify(allParams));
    }

    const separateHashesResponse = await oThis._getSeparateHashes(kind, allParams);
    if (separateHashesResponse.isFailure()) {
      return oThis._customError(
        'a_mo_m_cs_8',
        'Error while segregating params into encrypted hash and unencrypted hash'
      );
    }

    const hashToEncrypt = separateHashesResponse.data.hashToEncrypt,
      hashNotToEncrypt = separateHashesResponse.data.hashNotToEncrypt;
    let encryptedHash = null;

    if (hashToEncrypt) {
      const encryptedHashResponse = await oThis._getEncryption(hashToEncrypt, encryptionSaltId);

      if (encryptedHashResponse.isFailure()) {
        return oThis._customError('a_mo_m_cs_9', 'Error while encrypting data');
      }
      encryptedHash = encryptedHashResponse.data;
    }

    const hashNotToEncryptString = JSON.stringify(hashNotToEncrypt);

    const insertData = {
      chain_id: chainId,
      kind: strategyKindInt,
      group_id: groupId,
      encrypted_params: encryptedHash,
      unencrypted_params: hashNotToEncryptString,
      encryption_salt_id: encryptionSaltId,
      status: 2
    };

    const insertResult = await oThis.insert(insertData).fire();

    return Promise.resolve(responseHelper.successWithData(insertResult.insertId));
  }

  /**
   * Get complete config strategy hash by passing array of strategy ids.
   *
   * @param {array} ids
   * @returns {Promise<Promise<never>|Promise<{}>>}
   */
  async getByIds(ids) {
    const oThis = this;

    if (ids.length === 0) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_mo_m_cs_gbi_1',
          api_error_identifier: 'empty_strategy_array',
          debug_options: {},
          error_config: errorConfig
        })
      );
    }

    const queryResult = await oThis
      .select(['id', 'encrypted_params', 'unencrypted_params', 'kind', 'encryption_salt_id'])
      .where(['id IN (?)', ids])
      .fire();

    const decryptedSalts = {},
      finalResult = {};

    for (let index = 0; index < queryResult.length; index++) {
      // Following logic is added so that decrypt call is not given for already decrypted salts.
      if (decryptedSalts[queryResult[index].encryption_salt_id] == null) {
        const response = await oThis.getDecryptedSalt(queryResult[index].encryption_salt_id);
        if (response.isFailure()) {
          return Promise.reject(
            responseHelper.error({
              internal_error_identifier: 'a_mo_m_cs_gbi_2',
              api_error_identifier: 'something_went_wrong',
              debug_options: {},
              error_config: errorConfig
            })
          );
        }

        decryptedSalts[queryResult[index].encryption_salt_id] = response.data.addressSalt;
      }

      let localDecryptedJsonObj = {};

      if (queryResult[index].encrypted_params) {
        const localDecryptedParams = localCipher.decrypt(
          decryptedSalts[queryResult[index].encryption_salt_id],
          queryResult[index].encrypted_params
        );
        localDecryptedJsonObj = JSON.parse(localDecryptedParams);
      }

      const configStrategyHash = JSON.parse(queryResult[index].unencrypted_params);

      localDecryptedJsonObj = oThis.mergeConfigResult(
        queryResult[index].kind,
        configStrategyHash,
        localDecryptedJsonObj
      );

      finalResult[queryResult[index].id] = localDecryptedJsonObj;
    }

    return Promise.resolve(finalResult);
  }

  /**
   * Merge config strategy result.
   *
   * @param {string} strategyKind
   * @param {object} configStrategyHash {}
   * @param {object} decryptedJsonObj
   *
   * @return {object}
   */
  mergeConfigResult(strategyKind, configStrategyHash, decryptedJsonObj) {
    if (
      kinds[strategyKind] === configStrategyConstants.dynamodb ||
      kinds[strategyKind] === configStrategyConstants.globalDynamodb ||
      kinds[strategyKind] === configStrategyConstants.originDynamodb
    ) {
      configStrategyHash[kinds[strategyKind]].apiSecret = decryptedJsonObj.dynamoApiSecret;
      configStrategyHash[kinds[strategyKind]].autoScaling.apiSecret = decryptedJsonObj.dynamoAutoscalingApiSecret;
    } else if (kinds[strategyKind] === configStrategyConstants.elasticSearch) {
      configStrategyHash[kinds[strategyKind]].apiSecret = decryptedJsonObj.esSecretKey;
    } else if (
      kinds[strategyKind] === configStrategyConstants.rabbitmq ||
      kinds[strategyKind] === configStrategyConstants.globalRabbitmq ||
      kinds[strategyKind] === configStrategyConstants.originRabbitmq ||
      kinds[strategyKind] === configStrategyConstants.webhooksPreProcessorRabbitmq ||
      kinds[strategyKind] === configStrategyConstants.webhooksProcessorRabbitmq
    ) {
      configStrategyHash[kinds[strategyKind]].password = decryptedJsonObj.rmqPassword;
    }

    return configStrategyHash;
  }

  /**
   * Get strategy ids by kind and chainId.
   *
   * @param {string} kind
   * @param {number} chainId
   *
   * @return {Promise<any>}
   */
  async getStrategyIdsByKindAndChainId(kind, chainId) {
    const oThis = this,
      strategyKindInt = invertedKinds[kind];

    if (strategyKindInt === undefined) {
      throw new Error('Error: Improper kind parameter');
    }

    const query = oThis.select(['id', 'chain_id']).where(['kind = ?', strategyKindInt]);

    if (chainId) {
      query.where([' (chain_id = ? OR chain_id = 0)', chainId]);
    }

    const queryResult = await query.fire();

    return Promise.resolve(responseHelper.successWithData(queryResult));
  }

  /**
   * Get distinct chain-ids whose status is currently 'active'.
   *
   * @returns {Promise<Promise<any>>}
   */
  async getDistinctActiveChainIds() {
    const oThis = this;

    const distinctChainIdArray = [],
      activeStatus = configStrategyConstants.invertedStatuses[configStrategyConstants.activeStatus];

    const query = oThis
        .select('chain_id')
        .where(['status = ?', activeStatus])
        .group_by('chain_id'),
      queryResult = await query.fire();

    for (let index = 0; index < queryResult.length; index++) {
      distinctChainIdArray.push(queryResult[index].chain_id);
    }

    return Promise.resolve(responseHelper.successWithData(distinctChainIdArray));
  }

  /**
   * This function returns chain ids of the strategy ids passed as an array.
   *
   * @param {array} strategyIdsArray
   *
   * @returns {Promise<*>}
   */
  async getChainIdsByStrategyIds(strategyIdsArray) {
    const oThis = this;

    if (strategyIdsArray.length === 0) {
      logger.error('Empty strategy Ids array was passed');

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_mo_cs_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {},
          error_config: errorConfig
        })
      );
    }

    const queryResult = await oThis
      .select(['id', 'chain_id'])
      .where(['id IN (?)', strategyIdsArray])
      .fire();

    return Promise.resolve(responseHelper.successWithData(queryResult));
  }

  /**
   * Get Decrypted Config Strategy Salt from Cache or fetch.
   *
   * @param {number} managedAddressSaltId
   *
   * @return {Promise<Result>}
   */
  async getDecryptedSalt(managedAddressSaltId) {
    const oThis = this,
      cacheKey = coreConstants.CONFIG_STRATEGY_SALT + '_' + managedAddressSaltId;

    const consistentBehavior = '0';
    const cacheObject = InMemoryCacheProvider.getInstance(consistentBehavior);
    const cacheImplementer = cacheObject.cacheInstance;

    const configSaltResp = await cacheImplementer.get(cacheKey);
    let configSalt = configSaltResp.data.response;

    if (!configSalt) {
      const addrSaltResp = await oThis._fetchAddressSalt(managedAddressSaltId);
      configSalt = addrSaltResp.data.addressSalt;
      await cacheImplementer.set(cacheKey, configSalt);
    }

    return Promise.resolve(responseHelper.successWithData({ addressSalt: configSalt }));
  }

  /**
   * Fetch address salt.
   *
   * @param {number} managedAddressSaltId
   *
   * @returns {Promise<Promise<never>|Promise<any>>}
   * @private
   */
  async _fetchAddressSalt(managedAddressSaltId) {
    const encryptionSaltModelObj = new EncryptionSaltModel();
    const addrSalt = await encryptionSaltModelObj.getById(managedAddressSaltId);

    if (!addrSalt[0]) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'cm_mas_1',
          api_error_identifier: 'invalid_params',
          error_config: errorConfig
        })
      );
    }

    const KMSObject = new KmsWrapper(ConfigStrategyModel.encryptionPurpose);
    const decryptedSalt = await KMSObject.decrypt(addrSalt[0].salt);
    if (!decryptedSalt.Plaintext) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'cm_mas_2',
          api_error_identifier: 'invalid_params',
          error_config: errorConfig
        })
      );
    }

    const salt = decryptedSalt.Plaintext;

    return Promise.resolve(responseHelper.successWithData({ addressSalt: salt }));
  }

  /**
   * This method updates strategy ID.
   *
   * @param {number} strategy_id
   * @param {object} config_strategy_params
   *
   * @returns {Promise<*>}
   */
  async updateStrategyId(strategy_id, config_strategy_params) {
    const oThis = this,
      strategyId = strategy_id,
      configStrategyParams = config_strategy_params,
      queryResult = await new ConfigStrategyModel()
        .select(['encryption_salt_id', 'kind'])
        .where({ id: strategyId })
        .fire();

    if (queryResult.length === 0) {
      return oThis._customError('mo_m_cs_usi_1', 'Strategy id is invalid');
    }

    const finalDataToInsertInDb = {},
      strategyKind = queryResult[0].kind,
      managedAddressSaltId = queryResult[0].encryption_salt_id,
      strategyKindName = configStrategyConstants.kinds[strategyKind];

    const validationResult = configValidator.validateConfigStrategy(strategyKindName, configStrategyParams);

    if (validationResult === false) {
      return oThis._customError('mo_m_cs_usi_2', 'Config validation failed');
    }

    // Segregate data to encrypt and data not to encrypt.
    const separateHashesResponse = await oThis._getSeparateHashes(strategyKindName, configStrategyParams);
    if (separateHashesResponse.isFailure()) {
      return oThis._customError(
        'mo_m_cs_usi_5',
        'Error while segregating params into encrypted hash and unencrypted hash'
      );
    }

    const hashToEncrypt = separateHashesResponse.data.hashToEncrypt,
      hashNotToEncrypt = separateHashesResponse.data.hashNotToEncrypt;
    let encryptedHash = null;

    if (hashToEncrypt) {
      const encryptedHashResponse = await oThis._getEncryption(hashToEncrypt, managedAddressSaltId);

      if (encryptedHashResponse.isFailure()) {
        return oThis._customError('mo_m_cs_usi_6', 'Error while encrypting data');
      }
      encryptedHash = encryptedHashResponse.data;
    }

    finalDataToInsertInDb.encrypted_params = encryptedHash;
    finalDataToInsertInDb.unencrypted_params = JSON.stringify(hashNotToEncrypt);

    await new ConfigStrategyModel()
      .update(finalDataToInsertInDb)
      .where({ id: strategyId })
      .fire();

    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   * Segregate encrypted and un-encrypted config hash.
   *
   * @param {string} strategyKindName
   * @param {object} configStrategyParams
   *
   * @returns {Promise<hash>}
   * @private
   */
  async _getSeparateHashes(strategyKindName, configStrategyParams) {
    const hashToEncrypt = {},
      hashNotToEncrypt = configStrategyParams;
    let encryptedKeysFound = false;

    if (
      strategyKindName === configStrategyConstants.dynamodb ||
      strategyKindName === configStrategyConstants.globalDynamodb ||
      strategyKindName === configStrategyConstants.originDynamodb
    ) {
      const dynamoApiSecret = hashNotToEncrypt[strategyKindName].apiSecret,
        dynamoAutoscalingApiSecret = hashNotToEncrypt[strategyKindName].autoScaling.apiSecret;

      hashNotToEncrypt[strategyKindName].apiSecret = '{{dynamoApiSecret}}';
      hashToEncrypt.dynamoApiSecret = dynamoApiSecret;

      hashNotToEncrypt[strategyKindName].autoScaling.apiSecret = '{{dynamoAutoscalingApiSecret}}';
      hashToEncrypt.dynamoAutoscalingApiSecret = dynamoAutoscalingApiSecret;
      encryptedKeysFound = true;
    } else if (strategyKindName === configStrategyConstants.elasticSearch) {
      const esSecretKey = hashNotToEncrypt[strategyKindName].apiSecret;

      hashNotToEncrypt[strategyKindName].apiSecret = '{{apiSecret}}';
      hashToEncrypt.esSecretKey = esSecretKey;
      encryptedKeysFound = true;
    } else if (
      strategyKindName === configStrategyConstants.rabbitmq ||
      strategyKindName === configStrategyConstants.globalRabbitmq ||
      strategyKindName === configStrategyConstants.originRabbitmq ||
      strategyKindName === configStrategyConstants.webhooksPreProcessorRabbitmq ||
      strategyKindName === configStrategyConstants.webhooksProcessorRabbitmq
    ) {
      const rmqPassword = hashNotToEncrypt[strategyKindName].password;

      hashNotToEncrypt[strategyKindName].password = '{{rmqPassword}}';
      hashToEncrypt.rmqPassword = rmqPassword;
      encryptedKeysFound = true;
    }

    const returnHash = {
      hashToEncrypt: encryptedKeysFound ? hashToEncrypt : null,
      hashNotToEncrypt: hashNotToEncrypt
    };

    return Promise.resolve(responseHelper.successWithData(returnHash));
  }

  /**
   * Encrypt params using salt.
   *
   * @param {object} paramsToEncrypt
   * @param {number} managedAddressSaltId
   *
   * @returns {Promise<*>}
   * @private
   */
  async _getEncryption(paramsToEncrypt, managedAddressSaltId) {
    const oThis = this;

    const response = await oThis.getDecryptedSalt(managedAddressSaltId);
    if (response.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'm_tb_dshh_y_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    const paramsToEncryptString = JSON.stringify(paramsToEncrypt),
      encryptedConfigStrategyParams = localCipher.encrypt(response.data.addressSalt, paramsToEncryptString);

    return Promise.resolve(responseHelper.successWithData(encryptedConfigStrategyParams));
  }

  /**
   * Sets the status of given strategy id as active.
   *
   * @param {number} id: config_strategy_id from config_strategies table
   *
   * @returns {Promise<*>}
   */
  async activateById(id) {
    const oThis = this,
      activeStatus = configStrategyConstants.invertedStatuses[configStrategyConstants.activeStatus];

    // Update query
    const queryResponse = await oThis
      .update({ status: activeStatus })
      .where(['id = ?', id])
      .fire();

    if (!queryResponse) {
      return oThis._customError('m_tb_dshh_y_2', 'Error in setStatusActive');
    }
    if (queryResponse.affectedRows === 1) {
      logger.info(`Status of strategy id: [${id}] is now active.`);

      return Promise.resolve(responseHelper.successWithData({}));
    }

    return oThis._customError('m_tb_dshh_y_3', 'Strategy Id not present in the table');
  }

  /**
   * Custom error
   *
   * @param {string} errCode
   * @param {string} errMsg
   *
   * @returns {Promise<never>}
   * @private
   */
  _customError(errCode, errMsg) {
    logger.error(errMsg);

    return Promise.reject(
      responseHelper.error({
        internal_error_identifier: errCode,
        api_error_identifier: 'something_went_wrong',
        debug_options: { errMsg: errMsg },
        error_config: errorConfig
      })
    );
  }

  static get encryptionPurpose() {
    return encryptionPurpose;
  }
}

module.exports = ConfigStrategyModel;
