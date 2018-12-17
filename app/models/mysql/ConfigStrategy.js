'use strict';

/**
 * Model to get config strategies details.
 *
 * @module app/models/mysql/ConfigStrategy
 */

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  localCipher = require(rootPrefix + '/lib/encryptors/localCipher'),
  KmsWrapper = require(rootPrefix + '/lib/authentication/kmsWrapper'),
  InMemoryCacheProvider = require(rootPrefix + '/lib/providers/inMemoryCache'),
  ManagedAddressSaltModel = require(rootPrefix + '/app/models/mysql/ManagedAddressSalt'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  errorConfig = basicHelper.fetchErrorConfig(apiVersions.general);

const dbName = 'saas_config_' + coreConstants.SUB_ENVIRONMENT + '_' + coreConstants.ENVIRONMENT;

const kinds = configStrategyConstants.kinds,
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

  /*
  * inserts the config strategy params, kind, managed address salt and sha encryption of config strategy params.
  *
  * @param kind(eg. dynamo, memcached etc)
  * @param managedAddressSaltId
  * @param configStrategyParams: It contains complete configuration of any particular kind
  * @param group_id: Group Id to associate for the given params.(optional)
  * @return {Promise<integer>} - returns a Promise with integer of strategy id.
  *
  */
  async create(kind, managedAddressSaltId, configStrategyParams, groupId) {
    const oThis = this,
      strategyKindInt = invertedKinds[kind];

    if (strategyKindInt === undefined) {
      logger.error('Improper Kind parameter');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_mo_cs_c_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {},
          error_config: errorConfig
        })
      );
    }

    if (groupId === undefined) {
      groupId = null;
    }

    if (!configStrategyParams) {
      logger.error('Config Strategy params hash cannot be null');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_mo_cs_c_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {},
          error_config: errorConfig
        })
      );
    }

    let validation = await oThis._validateSpecificParameterKeys(kind, configStrategyParams);

    if (validation.isFailure()) {
      logger.error('Specific validation failed');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_mo_cs_c_15',
          api_error_identifier: 'something_went_wrong',
          debug_options: {},
          error_config: errorConfig
        })
      );
    }

    let hashedConfigStrategyParamsResponse = await oThis._getSHAOf(configStrategyParams);
    if (hashedConfigStrategyParamsResponse.isFailure()) {
      logger.error('Error while creating SHA of params');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_mo_cs_c_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: {},
          error_config: errorConfig
        })
      );
    }

    let hashedConfigStrategyParams = hashedConfigStrategyParamsResponse.data;

    let strategyIdPresentInDB = await new ConfigStrategyModel().getByParams(hashedConfigStrategyParams);
    logger.info('strategyIdPresentInDB------', strategyIdPresentInDB);


    if (strategyIdPresentInDB !== null) {
      //If configStrategyParamsNotToEncrypt is already present in database then id of that param is sent
      logger.info('The given params is already present in database with id:', strategyIdPresentInDB);
      return Promise.resolve(responseHelper.successWithData(strategyIdPresentInDB));
    } else {
      
      let separateHashesResponse = await oThis._getSeparateHashes(kind, configStrategyParams);
      if (separateHashesResponse.isFailure()) {
        logger.error('Error while segregating params into encrypted hash and unencrypted hash');
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'a_mo_cs_c_4',
            api_error_identifier: 'something_went_wrong',
            debug_options: {},
            error_config: errorConfig
          })
        );
      }

      let hashToEncrypt = separateHashesResponse.data.hashToEncrypt,
        hashNotToEncrypt = separateHashesResponse.data.hashNotToEncrypt,
        encryptedHashResponse = await oThis._getEncryption(hashToEncrypt, managedAddressSaltId);

      if (encryptedHashResponse.isFailure()) {
        logger.error('Error while encrypting data');
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'a_mo_cs_c_5',
            api_error_identifier: 'something_went_wrong',
            debug_options: {},
            error_config: errorConfig
          })
        );
      }

      let encryptedHash = encryptedHashResponse.data,
        hashNotToEncryptString = JSON.stringify(hashNotToEncrypt);

      const data = {
        group_id: groupId,
        kind: strategyKindInt,
        encrypted_params: encryptedHash,
        unencrypted_params: hashNotToEncryptString,
        managed_address_salts_id: managedAddressSaltId,
        hashed_params: hashedConfigStrategyParams
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
          internal_error_identifier: 'm_tb_dsfhh_y_1',
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
              internal_error_identifier: 'm_tb_swry_1',
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

  mergeConfigResult(strategyKind, configStrategyHash, decryptedJsonObj) {

    if(kinds[strategyKind]== configStrategyConstants.dynamodb) {

      configStrategyHash[configStrategyConstants.dynamodb].apiSecret = decryptedJsonObj.dynamoApiSecret;
      configStrategyHash[configStrategyConstants.dynamodb].autoScaling.apiSecret = decryptedJsonObj.dynamoAutoscalingApiSecret;

    } else if(kinds[strategyKind]== configStrategyConstants.elasticSearch){

      configStrategyHash[configStrategyConstants.elasticSearch].secretKey = decryptedJsonObj.esSecretKey;

    } else if(kinds[strategyKind]== configStrategyConstants.rabbitmq){

      configStrategyHash[configStrategyConstants.rabbitmq].password = decryptedJsonObj.rmqPassword;

    } else if(kinds[strategyKind]== configStrategyConstants.sharedRabbitmq){

      configStrategyHash[configStrategyConstants.sharedRabbitmq].password = decryptedJsonObj.rmqPassword;

    }
    return configStrategyHash;
  }

  /**
   * @private
   *
   * This function is used by JSON.parse to check the key and value before returning.
   *
   */
  _dataReviver(key, value) {
    if (
      key == 'OST_UTILITY_GETH_RPC_PROVIDERS' ||
      key == 'OST_UTILITY_GETH_WS_PROVIDERS' ||
      key == 'OST_VALUE_GETH_RPC_PROVIDERS' ||
      key == 'OST_VALUE_GETH_WS_PROVIDERS'
    ) {
      return JSON.parse(value);
    }
    return value;
  }

  /*
   *
   * @param {string}:
   */
  async _getStrategyIdsByKindAndGroupId(kind, group_id) {
    const oThis = this,
      strategyKindInt = invertedKinds[kind],
      groupId = group_id;

    if (strategyKindInt == undefined) {
      throw 'Error: Improper kind parameter';
    }

    let query = oThis.select(['id', 'group_id']).where('kind = ' + strategyKindInt);

    if (group_id) {
      query.where([' (group_id = ? OR group_id IS NULL)', group_id]);
    }

    let queryResult = await query.fire();

    return Promise.resolve(responseHelper.successWithData(queryResult));
  }

  /*
   *
   * This function returns distinct group ids whose status is currently 'active':
   *
   * @return [Array]
   */
  async getDistinctActiveGroupIds() {
    const oThis = this;

    let distinctGroupIdArray = [],
      activeStatus = configStrategyConstants.invertedStatuses[configStrategyConstants.activeStatus];

    let query = oThis
        .select('group_id')
        .where(['status = ?', activeStatus])
        .group_by('group_id'),
      queryResult = await query.fire();

    for (let i = 0; i < queryResult.length; i++) {
      distinctGroupIdArray.push(queryResult[i].group_id);
    }

    return Promise.resolve(responseHelper.successWithData(distinctGroupIdArray));
  }

  /**
   * This function returns group ids of the strategy ids passed as an array
   * @param strategyIdsArray
   * @returns {Promise<*>}
   */
  async getGroupIdsByStrategyIds(strategyIdsArray) {
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
      .select(['id', 'group_id'])
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
   * @private
   *
   * @param managedAddressSaltId
   *
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
      logger.error('Strategy id is invalid');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'm_tb_cs_4',
          api_error_identifier: 'something_went_wrong',
          debug_options: {},
          error_config: errorConfig
        })
      );
    }

    let finalDataToInsertInDb = {},
      strategyKind = queryResult[0].kind,
      managedAddressSaltId = queryResult[0].managed_address_salts_id,
      strategyKindName = configStrategyConstants.kinds[strategyKind];

    let validation = await oThis._validateSpecificParameterKeys(strategyKindName, configStrategyParams);

    if (validation.isFailure()) {
      logger.error('Specific validation failed');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_mo_cs_c_16',
          api_error_identifier: 'something_went_wrong',
          debug_options: {},
          error_config: errorConfig
        })
      );
    }

    let shaEncryptionOfStrategyParamsResponse = await oThis._getSHAOf(configStrategyParams);
    if (shaEncryptionOfStrategyParamsResponse.isFailure()) {
      logger.error('Error while creating SHA of params');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_mo_cs_c_7',
          api_error_identifier: 'something_went_wrong',
          debug_options: {},
          error_config: errorConfig
        })
      );
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
      logger.error('The config strategy is already present in database with id: ', strategyIdPresentInDB);
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'm_tb_cs_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: {},
          error_config: errorConfig
        })
      );
    }

    //Segregate data to encrypt and data not to encrypt
    let separateHashesResponse = await oThis._getSeparateHashes(strategyKindName, configStrategyParams);
    if (separateHashesResponse.isFailure()) {
      logger.error('Error while segregating params into encrypted hash and unencrypted hash');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_mo_cs_c_8',
          api_error_identifier: 'something_went_wrong',
          debug_options: {},
          error_config: errorConfig
        })
      );
    }

    let hashToEncrypt = separateHashesResponse.data.hashToEncrypt,
      hashNotToEncrypt = separateHashesResponse.data.hashNotToEncrypt,
      encryptedHashResponse = await oThis._getEncryption(hashToEncrypt, managedAddressSaltId);

    if (encryptedHashResponse.isFailure()) {
      logger.error('Error while encrypting data');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_mo_cs_c_9',
          api_error_identifier: 'something_went_wrong',
          debug_options: {},
          error_config: errorConfig
        })
      );
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
   * @param (object) paramsHash (complete hash of that strategy)
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
   *
   * @param(string) strategyKind
   * @param(object) configStrategyParams
   * @returns {Promise<any>}
   * @private
   */
  async _getSeparateHashes(strategyKindName, configStrategyParams) {

    let hashToEncrypt = {},
      hashNotToEncrypt = configStrategyParams;

    if(strategyKindName == configStrategyConstants.dynamodb){
      let dynamoApiSecret = hashNotToEncrypt[configStrategyConstants.dynamodb].apiSecret,
        dynamoAutoscalingApiSecret = hashNotToEncrypt[configStrategyConstants.dynamodb].autoScaling.apiSecret;

      hashNotToEncrypt[configStrategyConstants.dynamodb].apiSecret = "{{dynamoApiSecret}}";
      hashToEncrypt["dynamoApiSecret"] = dynamoApiSecret;

      hashNotToEncrypt[configStrategyConstants.dynamodb].autoScaling.apiSecret = "{{dynamoAutoscalingApiSecret}}";
      hashToEncrypt["dynamoAutoscalingApiSecret"] = dynamoAutoscalingApiSecret;

    } else if (strategyKindName == configStrategyConstants.elasticSearch){

      let esSecretKey = hashNotToEncrypt[configStrategyConstants.elasticSearch].secretKey;

      hashNotToEncrypt[configStrategyConstants.elasticSearch].secretKey = "{{esSecretKey}}";
      hashToEncrypt["esSecretKey"] = esSecretKey;

    } else if (strategyKindName == configStrategyConstants.rabbitmq){

      let rmqPassword = hashNotToEncrypt[configStrategyConstants.rabbitmq].password;

      hashNotToEncrypt[configStrategyConstants.rabbitmq].password = "{{rmqPassword}}";
      hashToEncrypt["rmqPassword"] = rmqPassword;

    } else if (strategyKindName == configStrategyConstants.sharedRabbitmq){

      let rmqPassword = hashNotToEncrypt[configStrategyConstants.sharedRabbitmq].password;

      hashNotToEncrypt[configStrategyConstants.sharedRabbitmq].password = "{{rmqPassword}}";
      hashToEncrypt["rmqPassword"] = rmqPassword;

    }

    let returnHash = {
      hashToEncrypt: hashToEncrypt,
      hashNotToEncrypt: hashNotToEncrypt
    };

    return Promise.resolve(responseHelper.successWithData(returnHash));
  }

  /**
   *
   * @param(object) paramsToEncrypt
   * @param(integer) managed_address_salt_id
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
   * This function will validate only utility constants, value_geth and utility_geth
   * @param strategyKind
   * @param paramsToValidate
   * @returns {Promise<void>}
   * @private
   */
  async _validateSpecificParameterKeys(strategyKind, paramsToValidate) {


    return Promise.resolve(responseHelper.successWithData({}));
  }

  async _validateUtilityProviderForUniqueness(paramsToValidate) {
    let keyWhoseValueShouldBeAnObject = ['read_only', 'read_write'],
      keysWhoseValueShouldBeAnArray = ['OST_UTILITY_GETH_RPC_PROVIDERS', 'OST_UTILITY_GETH_WS_PROVIDERS'];

    for (let index in keyWhoseValueShouldBeAnObject) {
      let keyWhoseValueToCheck = keyWhoseValueShouldBeAnObject[index],
        value = paramsToValidate[keyWhoseValueToCheck];

      for (let i in keysWhoseValueShouldBeAnArray) {
        let keyName = keysWhoseValueShouldBeAnArray[i],
          providerArray = value[keyName];

        if (providerArray.length !== new Set(providerArray).size) {
          logger.error(`[${keysWhoseValueShouldBeAnArray[i]}] contains non-unique endpoints.`);
          return Promise.reject(
            responseHelper.error({
              internal_error_identifier: 'm_tb_dshh_y_5',
              api_error_identifier: 'something_went_wrong',
              debug_options: {}
            })
          );
        }
      }
    }

    return Promise.resolve(responseHelper.successWithData({}));
  }
}

module.exports = ConfigStrategyModel;
