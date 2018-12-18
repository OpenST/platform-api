'use strict';
/**
 * Model to get config strategies details.
 *
 * @module app/models/mysql/ConfigStrategy
 */
const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  localCipher = require(rootPrefix + '/lib/encryptors/localCipher'),
  configValidator = require(rootPrefix + '/helpers/configValidator'),
  KmsWrapper = require(rootPrefix + '/lib/authentication/kmsWrapper'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  InMemoryCacheProvider = require(rootPrefix + '/lib/providers/inMemoryCache'),
  configStrategyValidator = require(rootPrefix + '/lib/validators/configStrategy'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  ManagedAddressSaltModel = require(rootPrefix + '/app/models/mysql/ManagedAddressSalt');

const errorConfig = basicHelper.fetchErrorConfig(apiVersions.general),
  dbName = 'config_' + coreConstants.SUB_ENVIRONMENT + '_' + coreConstants.ENVIRONMENT,
  kinds = configStrategyConstants.kinds,
  invertedKinds = configStrategyConstants.invertedKinds;

/**
 * constructor
 * @constructor
 */
class ConfigStrategyModel extends ModelBase {

  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'config_strategies';
  }

  /**
   * Create record of config strategy
   *
   * @param kind {string} - kind string
   * @param chainId {number} - chain id
   * @param groupId {number} - group id
   * @param allParams {object} - all params object
   * @param encryptionSaltId {number} (optional) - encryption salt id - presently the id of managed_address_salts table
   *
   * @returns {Promise<*>}
   */
  async create(kind, chainId, groupId, allParams, encryptionSaltId) {
    const oThis = this;

    let strategyKindInt = await configStrategyValidator.getStrategyKindInt(kind);

    if (encryptionSaltId === undefined) encryptionSaltId = 0;

    await configStrategyValidator.validateChainIdKindCombination(kind, chainId);

    if (!chainId) chainId = 0;

    await configStrategyValidator.validateGroupIdAndChainId(chainId, groupId);

    if (!allParams) {
      return oThis._customError('a_mo_m_cs_5', 'Config Strategy params hash cannot be null');
    }

    // check if proper keys are present in all params
    if (!configValidator.validateConfigStrategy(kind, allParams)) {
      return oThis._customError('a_mo_m_cs_6', 'Config params validation failed for: ' + JSON.stringify(allParams));
    }

    let hashedConfigStrategyParamsResponse = await oThis._getSHAOf(allParams),
      hashedConfigStrategyParams = hashedConfigStrategyParamsResponse.data;
    if (hashedConfigStrategyParamsResponse.isFailure()) {
      return oThis._customError('a_mo_m_cs_7', 'Error while creating SHA of params');
    }

    // try to fetch config strategy using the hashed params: if fetched, error out
    let strategyIdPresentInDB = await new ConfigStrategyModel().getByParams(hashedConfigStrategyParams);

    if (strategyIdPresentInDB !== null) {
      //If configStrategyParamsNotToEncrypt is already present in database then id of that param is sent
      logger.info('The given params is already present in database with id:', strategyIdPresentInDB);
      return Promise.resolve(responseHelper.successWithData(strategyIdPresentInDB));
    } else {
      
      let separateHashesResponse = await oThis._getSeparateHashes(kind, allParams);
      if (separateHashesResponse.isFailure()) {
        return oThis._customError('a_mo_m_cs_8', 'Error while segregating params into encrypted hash and unencrypted hash');
      }

      let hashToEncrypt = separateHashesResponse.data.hashToEncrypt,
        hashNotToEncrypt = separateHashesResponse.data.hashNotToEncrypt,
        encryptedHashResponse = await oThis._getEncryption(hashToEncrypt, encryptionSaltId);

      if (encryptedHashResponse.isFailure()) {
        return oThis._customError('a_mo_m_cs_9', 'Error while encrypting data');
      }

      let encryptedHash = encryptedHashResponse.data,
        hashNotToEncryptString = JSON.stringify(hashNotToEncrypt);

      const data = {
        chain_id: chainId,
        kind: strategyKindInt,
        group_id: groupId,
        encrypted_params: encryptedHash,
        unencrypted_params: hashNotToEncryptString,
        managed_address_salts_id: encryptionSaltId,
        hashed_params: hashedConfigStrategyParams,
        status: 2
      };
      
      const dbId = await oThis.insert(data).fire();

      return Promise.resolve(responseHelper.successWithData(dbId.insertId));
    }
  }

  /*
  * get complete ConfigStrategy hash by passing array of strategy ids.
  *
  * @param ids: strategy ids
  * @return {Promise<Hash>} - returns a Promise with a flat hash of config strategy.
  *
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
      .select(['id', 'encrypted_params', 'unencrypted_params', 'kind', 'managed_address_salts_id'])
      .where(['id IN (?)', ids])
      .fire();

    let decryptedSalts = {},
      finalResult = {};

    for (let i = 0; i < queryResult.length; i++) {
      //Following logic is added so that decrypt call is not given for already decrypted salts.
      if (decryptedSalts[queryResult[i].managed_address_salts_id] == null) {
        let response = await oThis.getDecryptedSalt(queryResult[i].managed_address_salts_id);
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

        decryptedSalts[queryResult[i].managed_address_salts_id] = response.data.addressSalt;
      }

      let localDecryptedParams = localCipher.decrypt(
        decryptedSalts[queryResult[i].managed_address_salts_id],
        queryResult[i].encrypted_params
      );

      let localDecryptedJsonObj = JSON.parse(localDecryptedParams),
        configStrategyHash = JSON.parse(queryResult[i].unencrypted_params);

      localDecryptedJsonObj = oThis.mergeConfigResult(queryResult[i].kind, configStrategyHash, localDecryptedJsonObj);
      
      finalResult[queryResult[i].id] = localDecryptedJsonObj;
    }

    return Promise.resolve(finalResult);
  }
  
  /**
   *
   * @param strategyKind
   * @param configStrategyHash
   * @param decryptedJsonObj
   * @return configStrategyHash
   */
  mergeConfigResult(strategyKind, configStrategyHash, decryptedJsonObj) {

    if(kinds[strategyKind] == configStrategyConstants.dynamodb || kinds[strategyKind] == configStrategyConstants.globalDynamo) {

      configStrategyHash[kinds[strategyKind]].apiSecret = decryptedJsonObj.dynamoApiSecret;
      configStrategyHash[kinds[strategyKind]].autoScaling.apiSecret = decryptedJsonObj.dynamoAutoscalingApiSecret;

    } else if(kinds[strategyKind] == configStrategyConstants.elasticSearch){

      configStrategyHash[kinds[strategyKind]].secretKey = decryptedJsonObj.esSecretKey;

    } else if(kinds[strategyKind] == configStrategyConstants.rabbitmq || kinds[strategyKind] == configStrategyConstants.globalRabbitmq){

      configStrategyHash[kinds[strategyKind]].password = decryptedJsonObj.rmqPassword;

    }
    return configStrategyHash;
  }
  
  /**
   *
   * @param kind
   * @param chainId
   * @return {Promise<any>}
   * @private
   */
  async _getStrategyIdsByKindAndChainId(kind, chainId) {
    const oThis = this,
      strategyKindInt = invertedKinds[kind];

    if (strategyKindInt === undefined) {
      throw 'Error: Improper kind parameter';
    }

    let query = oThis.select(['id', 'chain_id']).where('kind = ' + strategyKindInt);

    if (chainId) {
      query.where([' (chain_id = ? OR chain_id IS NULL)', chainId]);
    }

    let queryResult = await query.fire();

    return Promise.resolve(responseHelper.successWithData(queryResult));
  }

  /*
   *
   * This function returns distinct chain-ids whose status is currently 'active':
   *
   * @return [Array]
   */
  async getDistinctActiveChainIds() {
    const oThis = this;

    let distinctGroupIdArray = [],
      activeStatus = configStrategyConstants.invertedStatuses[configStrategyConstants.activeStatus];

    let query = oThis
        .select('chain_id')
        .where(['status = ?', activeStatus])
        .group_by('chain_id'),
      queryResult = await query.fire();

    for (let i = 0; i < queryResult.length; i++) {
      distinctGroupIdArray.push(queryResult[i].chain_id);
    }

    return Promise.resolve(responseHelper.successWithData(distinctChainIdArray));
  }

  /**
   * This function returns chain ids of the strategy ids passed as an array
   * @param strategyIdsArray
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

  /*
  * Get strategy id by passing SHA encryption of params hash.<br><br>
  *
  * @param {Object} params - hashed_params - SHA of config strategy params.
  * @return {Promise<value>} - returns a Promise with a value of strategy id if it already exists.
  *
  */
  async getByParams(shaParams) {
    const oThis = this;

    let returnValue = null;

    let query = oThis.select('id').where({ hashed_params: shaParams }),
      queryResult = await query.fire();

    if (queryResult.length !== 0) {
      returnValue = queryResult[0].id;
    }

    return Promise.resolve(returnValue);
  }

  /**
   * Get Decrypted Config Strategy Salt from Cache or fetch.<br><br>
   *
   * @return {Promise<Result>} - returns a Promise with a decrypted salt.
   *
   */
  async getDecryptedSalt(managedAddressSaltId) {
    const oThis = this,
      cacheKey = coreConstants.CONFIG_STRATEGY_SALT + '_' + managedAddressSaltId;

    let consistentBehavior = '0';
    const cacheObject = InMemoryCacheProvider.getInstance(consistentBehavior);
    const cacheImplementer = cacheObject.cacheInstance;

    let configSaltResp = await cacheImplementer.get(cacheKey),
      configSalt = configSaltResp.data.response;

    if (!configSalt) {
      const addrSaltResp = await oThis._fetchAddressSalt(managedAddressSaltId);
      configSalt = addrSaltResp.data.addressSalt;
      await cacheImplementer.set(cacheKey, configSalt);
    }

    return Promise.resolve(responseHelper.successWithData({ addressSalt: configSalt }));
  }
  
  /**
   *
   * @param managedAddressSaltId
   * @return {Promise<*>}
   * @private
   */

  async _fetchAddressSalt(managedAddressSaltId) {

    let addrSalt = await new ManagedAddressSaltModel().getById(managedAddressSaltId);

    if (!addrSalt[0]) {
      return Promise.reject(responseHelper.error({
        internal_error_identifier: 'cm_mas_1',
        api_error_identifier: 'invalid_params',
        error_config: errorConfig
      }));
    }

    let KMSObject = new KmsWrapper('managedAddresses');
    let decryptedSalt = await KMSObject.decrypt(addrSalt[0]['managed_address_salt']);
    if (!decryptedSalt['Plaintext']) {
      return Promise.reject(responseHelper.error({
        internal_error_identifier: 'cm_mas_2',
        api_error_identifier: 'invalid_params',
        error_config: errorConfig
      }));
    }

    let salt = decryptedSalt['Plaintext'];

    return Promise.resolve(responseHelper.successWithData({ addressSalt: salt }));
  }

  /**
   *
   * @param {integer} strategy_id
   * @param {object} config_strategy_params
   * @returns {Promise<*>}
   */
  async updateStrategyId(strategy_id, config_strategy_params) {
    const oThis = this,
      strategyId = strategy_id,
      configStrategyParams = config_strategy_params,
      queryResult = await new ConfigStrategyModel()
        .select(['managed_address_salts_id', 'kind'])
        .where({ id: strategyId })
        .fire();

    if (queryResult.length === 0) {
      return oThis._customError('mo_m_cs_usi_1', 'Strategy id is invalid');
    }

    let finalDataToInsertInDb = {},
      strategyKind = queryResult[0].kind,
      managedAddressSaltId = queryResult[0].managed_address_salts_id,
      strategyKindName = configStrategyConstants.kinds[strategyKind];

    let validationResult = configValidator.validateConfigStrategy(strategyKindName, configStrategyParams);

    if (validationResult === false) {
      return oThis._customError('mo_m_cs_usi_2', 'Config validation failed');
    }

    let shaEncryptionOfStrategyParamsResponse = await oThis._getSHAOf(configStrategyParams);
    if (shaEncryptionOfStrategyParamsResponse.isFailure()) {
      return oThis._customError('mo_m_cs_usi_3', 'Error while creating SHA of params');
    }

    let shaEncryptionOfStrategyParams = shaEncryptionOfStrategyParamsResponse.data,
      strategyIdPresentInDB = null;

    //Checks if the data sent to update is already present in database at some other row.
    await new ConfigStrategyModel()
      .getByParams(shaEncryptionOfStrategyParams)
      .then(function(result) {
        strategyIdPresentInDB = result;
      })
      .catch(function(err) {
        logger.error('Error', err);
      });

    if (strategyIdPresentInDB !== null && strategyIdPresentInDB != strategyId) {
      //If configStrategyParams is already present in database then id of that param is sent
      return oThis._customError('mo_m_cs_usi_4', 'The config strategy is already present in database with id: ' + strategyIdPresentInDB);
    }

    //Segregate data to encrypt and data not to encrypt
    let separateHashesResponse = await oThis._getSeparateHashes(strategyKindName, configStrategyParams);
    if (separateHashesResponse.isFailure()) {
      return oThis._customError('mo_m_cs_usi_5', 'Error while segregating params into encrypted hash and unencrypted hash');
    }

    let hashToEncrypt = separateHashesResponse.data.hashToEncrypt,
      hashNotToEncrypt = separateHashesResponse.data.hashNotToEncrypt,
      encryptedHashResponse = await oThis._getEncryption(hashToEncrypt, managedAddressSaltId);

    if (encryptedHashResponse.isFailure()) {
      return oThis._customError('mo_m_cs_usi_6', 'Error while encrypting data');
    }
    let encryptedHash = encryptedHashResponse.data;

    finalDataToInsertInDb.encrypted_params = encryptedHash;
    finalDataToInsertInDb.unencrypted_params = JSON.stringify(hashNotToEncrypt);
    finalDataToInsertInDb.hashed_params = shaEncryptionOfStrategyParams;

    const dbId = await new ConfigStrategyModel()
      .update(finalDataToInsertInDb)
      .where({ id: strategyId })
      .fire();

    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   *
   * @param {object} paramsHash (complete hash of that strategy)
   *
   * @return {Promise<Promise<never> | Promise<any>>}
   *
   * @private
   */
  async _getSHAOf(paramsHash) {

    let finalHashToGetShaOfString = JSON.stringify(paramsHash),
      shaOfStrategyParams = localCipher.getShaHashedText(finalHashToGetShaOfString);

    return Promise.resolve(responseHelper.successWithData(shaOfStrategyParams));
  }

  /**
   * Segregate encrypted and un-encrypted config hash
   *
   * @param {string} strategyKindName
   * @param {object} configStrategyParams
   *
   * @returns {Promise<hash>}
   * @private
   */
  async _getSeparateHashes(strategyKindName, configStrategyParams) {

    let hashToEncrypt = {},
      hashNotToEncrypt = configStrategyParams;

    if(strategyKindName == configStrategyConstants.dynamodb || strategyKindName == configStrategyConstants.globalDynamodb){
      let dynamoApiSecret = hashNotToEncrypt[strategyKindName].apiSecret,
        dynamoAutoscalingApiSecret = hashNotToEncrypt[strategyKindName].autoScaling.apiSecret;

      hashNotToEncrypt[strategyKindName].apiSecret = "{{dynamoApiSecret}}";
      hashToEncrypt["dynamoApiSecret"] = dynamoApiSecret;

      hashNotToEncrypt[strategyKindName].autoScaling.apiSecret = "{{dynamoAutoscalingApiSecret}}";
      hashToEncrypt["dynamoAutoscalingApiSecret"] = dynamoAutoscalingApiSecret;

    } else if (strategyKindName == configStrategyConstants.elasticSearch){

      let esSecretKey = hashNotToEncrypt[strategyKindName].secretKey;

      hashNotToEncrypt[strategyKindName].secretKey = "{{esSecretKey}}";
      hashToEncrypt["esSecretKey"] = esSecretKey;

    } else if (strategyKindName == configStrategyConstants.rabbitmq || strategyKindName == configStrategyConstants.globalRabbitmq){

      let rmqPassword = hashNotToEncrypt[strategyKindName].password;

      hashNotToEncrypt[strategyKindName].password = "{{rmqPassword}}";
      hashToEncrypt["rmqPassword"] = rmqPassword;

    }

    let returnHash = {
      hashToEncrypt: hashToEncrypt,
      hashNotToEncrypt: hashNotToEncrypt
    };

    return Promise.resolve(responseHelper.successWithData(returnHash));
  }

  /**
   * Encrypt params using salt
   *
   * @param{Object} paramsToEncrypt
   * @param {number} managedAddressSaltId
   * @returns {Promise<*>}
   * @private
   */
  async _getEncryption(paramsToEncrypt, managedAddressSaltId) {
    const oThis = this;

    let response = await oThis.getDecryptedSalt(managedAddressSaltId);
    if (response.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'm_tb_dshh_y_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    let paramsToEncryptString = JSON.stringify(paramsToEncrypt),
      encryptedConfigStrategyParams = localCipher.encrypt(response.data.addressSalt, paramsToEncryptString);

    return Promise.resolve(responseHelper.successWithData(encryptedConfigStrategyParams));
  }

  /**
   * Sets the status of given strategy id as active.
   *
   * @param {number}id - config_strategy_id from config_strategies table
   * @returns {Promise<*>}
   */
  async activateById(id) {
    const oThis = this,
      activeStatus = configStrategyConstants.invertedStatuses[configStrategyConstants.activeStatus];

    // update query
    let queryResponse = await oThis
      .update({ status: activeStatus })
      .where(['id = ?', id])
      .fire();

    if (!queryResponse) {
      return oThis._customError('m_tb_dshh_y_2', 'Error in setStatusActive');
    }
    if (queryResponse.affectedRows === 1) {
      logger.info(`Status of strategy id: [${id}] is now active.`);
      return Promise.resolve(responseHelper.successWithData({}));
    } else {
      return oThis._customError('m_tb_dshh_y_3', 'Strategy Id not present in the table');
    }
  }

  /**
   * Custom error
   *
   * @param errCode
   * @param errMsg
   * @returns {Promise<never>}
   * @private
   */
  _customError(errCode, errMsg) {
    logger.error(errMsg);
    return Promise.reject(
      responseHelper.error({
        internal_error_identifier: errCode,
        api_error_identifier: 'something_went_wrong',
        debug_options: {errMsg: errMsg},
        error_config: errorConfig
      })
    );
  }
}

module.exports = ConfigStrategyModel;
