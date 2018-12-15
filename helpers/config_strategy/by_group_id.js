'use strict';

/**
 * CRUD for config_strategies table
 * This provides functionality to
 * 1. Get Config Strategy Hash - getCompleteHash, getForKind, getByGroupId
 * 2. Add Config Strategy for given kind - addForKind
 * 3. Set status active/inactive - activateByStrategyId, activate, deactivate
 * 4. Update strategy for given kind - updateForKind
 * 5. Get all strategy kinds present - getAllKinds
 * @type {string}
 */
const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  ConfigStrategyModel = require(rootPrefix + '/app/models/mysql/ConfigStrategy'),
  ClientConfigStrategyModel = require(rootPrefix + '/app/models/mysql/ClientConfigStrategies'),
  configStrategyCacheKlass = require(rootPrefix + '/lib/sharedCacheMultiManagement/configStrategy');

/**
 * group_id is optional
 *
 * @param group_id
 *
 * @constructor
 */
class ConfigStrategyByGroupId {

  constructor(group_id) {
    const oThis = this;

    oThis.groupId = group_id;
  }

  /**
   * -This function will give a complete hash for the group id passed.
   * -If group id is not set in the constructor this function will return an consolidated hash of all those strategy ids for which
   *  group id is not set.
   *
   *  [IMPORTANT][ASSUMPTION]: For one group id only one service will be present for a kind. This means there cannot be
   *  multiple rows of same group id and kind. (Eg. For group id 1 only one dynamo kind will be present. Similarly for others.)
   *
   * @returns {Promise<*>} Returns a flat hash of strategies
   */
  async get() {
    const oThis = this,
      groupId = oThis.groupId;

    let whereClause = ['group_id = ?', groupId];

    //where clause will return where group Ids are NULL
    if (groupId === undefined) {
      whereClause = ['group_id IS NULL'];
    }

    let strategyIdsArray = await oThis._strategyIdsArrayProvider(whereClause);

    // to not replicate the decryption logic, we are calling the cache for the same.

    let fetchConfigStrategyRsp = await oThis._getConfigStrategyByStrategyId(strategyIdsArray);

    if (fetchConfigStrategyRsp.isFailure()) {
      logger.error('Error in fetching config strategy flat hash');
      return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_01'));
    }
    let finalFlatHash = oThis._cacheResponseFlatHashProvider(fetchConfigStrategyRsp);

    return Promise.resolve(responseHelper.successWithData(finalFlatHash));
  }

  /**
   * This function gives a complete flat hash of all the strategies including the ones whose group id is NULL.
   *
   * [IMPORTANT][ASSUMPTION]: Multiple value_geth, constants, in_memory, value_constants kinds will not be present in the table.
   * @param gethEndPointType - read_only or read_write(DEFAULT value)
   * @returns {Promise<*>}
   */
  async getCompleteHash(gethEndPointType) {
    const oThis = this,
      groupId = oThis.groupId;

    if (groupId === undefined) {
      logger.error('Group Id is not defined. To get complete hash group id is compulsory.');
      return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_02'));
    }

    let whereClause = ['group_id = ? OR group_id IS NULL', groupId],
      strategyIdsArray = await oThis._strategyIdsArrayProvider(whereClause);

    let fetchConfigStrategyRsp = await oThis._getConfigStrategyByStrategyId(strategyIdsArray);

    if (fetchConfigStrategyRsp.isFailure()) {
      logger.error('Error in fetching config strategy flat hash');
      return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_03'));
    }

    let finalFlatHash = oThis._cacheResponseFlatHashProvider(fetchConfigStrategyRsp, gethEndPointType);

    return Promise.resolve(responseHelper.successWithData(finalFlatHash));
  }

  /**
   * This function gives a hash for the kind provided.
   * It returns hash whose key is the strategy id and value is the flat hash of the strategy.
   * Eg:
   * {
   *    1: {
   *          OS_DYNAMODB_ACCESS_KEY_ID : 'xyz',
   *          OS_DYNAMODB_SECRET_ACCESS_KEY: 'x',
   *          .
   *          .
   *          .
   *       }
   * }
   * @param kind
   * @returns {Promise<*>}
   */
  async getForKind(kind) {
    const oThis = this,
      groupId = oThis.groupId;

    let strategyIdInt = configStrategyConstants.invertedKinds[kind],
      whereClause = null;

    if (strategyIdInt === undefined) {
      logger.error('Provided kind is not proper. Please check kind');
      return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_04'));
    }

    //Check if group id is needed for the given kind or not.
    if (configStrategyConstants.kindsWithoutGroupId.includes(kind)) {
      if (groupId) {
        logger.error(`To get [${kind}] group id is not required.`);
        return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_30'));
      }
      whereClause = ['group_id IS NULL AND kind = ?', strategyIdInt];
    } else {
      if (groupId === undefined) {
        logger.error(`Group id is mandatory for this kind. [${kind}]`);
        return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_29'));
      }
      whereClause = ['group_id = ? AND kind = ?', groupId, strategyIdInt];
    }

    return oThis._getByKindAndGroup(whereClause);
  }

  /**
   * This function gives a hash with active status for the kind provided.
   * It returns hash whose key is the strategy id and value is the flat hash of the strategy.
   * Eg:
   * {
   *    1: {
   *          OS_DYNAMODB_ACCESS_KEY_ID : 'xyz',
   *          OS_DYNAMODB_SECRET_ACCESS_KEY: 'x',
   *          .
   *          .
   *          .
   *       }
   * }
   * @param kind
   * @returns {Promise<*>}
   */
  async getActiveByKind(kind) {
    const oThis = this;

    let strategyIdInt = configStrategyConstants.invertedKinds[kind],
      activeStatus = configStrategyConstants.invertedStatuses[configStrategyConstants.activeStatus],
      whereClause = null;

    if (strategyIdInt === undefined) {
      logger.error('Provided kind is not proper. Please check kind');
      return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_04'));
    }

    if (oThis.groupId) {
      whereClause = ['group_id = ? AND kind = ? AND status = ?', oThis.groupId, strategyIdInt, activeStatus];
    } else {
      whereClause = ['kind = ? AND status = ?', strategyIdInt, activeStatus];
    }

    return oThis._getByKindAndGroup(whereClause);
  }

  async _getByKindAndGroup(whereClause) {
    const oThis = this;

    //Following is to fetch specific strategy id for the kind passed.
    let strategyIdsArray = await oThis._strategyIdsArrayProvider(whereClause);

    if (strategyIdsArray.length === 0) {
      logger.error('Strategy Id for the provided kind not found OR kind for the given group id does not exist');
      return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_05'));
    }

    let fetchConfigStrategyRsp = await oThis._getConfigStrategyByStrategyId(strategyIdsArray);

    if (fetchConfigStrategyRsp.isFailure()) {
      logger.error('Error in fetching config strategy flat hash');
      return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_06'));
    }

    let configStrategyIdToDetailMap = fetchConfigStrategyRsp.data,
      finalConfigStrategyFlatHash = {};

    for (let configStrategyId in configStrategyIdToDetailMap) {
      let configStrategy = configStrategyIdToDetailMap[configStrategyId];

      for (let strategyKind in configStrategy) {
        finalConfigStrategyFlatHash[configStrategyId] = configStrategy[strategyKind];
      }
    }

    return Promise.resolve(responseHelper.successWithData(finalConfigStrategyFlatHash));
  }

  /**
   * This function adds a strategy in config_strategies table. If the kind being inserted in value_geth or utility_geth then
   * WS provider and RPC provider is also inserted in the chain_geth_providers table.
   *
   * @param {string} kind (Eg:'dynamo')
   * @param {object} params - Hash of config params related to this kind
   * @param {number} managed_address_salt_id - managed_address_salt_id from managed_address_salt table
   * @returns {Promise<never>}
   */
  async addForKind(kind, params, managed_address_salt_id) {
    const oThis = this,
      groupId = oThis.groupId,
      strategyIdInt = configStrategyConstants.invertedKinds[kind];

    let insertResponse;

    if (strategyIdInt === undefined) {
      logger.error('Provided kind is not proper. Please check kind');
      return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_07'));
    }

    let managedAddressSaltId = managed_address_salt_id;

    if (configStrategyConstants.kindsWithoutGroupId.includes(kind)) {
      // If group id is present, reject
      if (groupId) {
        logger.error(`To insert [${kind}] group id is not required.`);
        return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_08'));
      }

      //Check if same kind is present in the table already.
      let whereClause = ['kind = ?', strategyIdInt],
        queryResponse = await oThis._strategyIdsArrayProvider(whereClause);

      if (queryResponse.length > 0) {
        logger.error(`[${kind}] already exist in the table.`);
        return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_09'));
      }

      let configStrategyModelObj = new ConfigStrategyModel();

      insertResponse = await configStrategyModelObj.create(kind, managedAddressSaltId, params);

      if (insertResponse.isFailure()) {
        logger.error('Error in inserting data in config_strategies table ');
        return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_10'));
      }
    } else {
      //Group id is mandatory for the kind passed as argument.
      //Check if same group id and kind does not exist in the table
      if (groupId === undefined) {
        logger.error(`To insert [${kind}] group id is mandatory.`);
        return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_11'));
      }

      //Check if same kind is present in the table already.
      let whereClause = ['group_id = ? AND kind = ?', groupId, strategyIdInt],
        queryResponse = await oThis._strategyIdsArrayProvider(whereClause);

      if (queryResponse.length > 0) {
        logger.error(`Group Id [${groupId}] with kind [${kind}] already exists in the table.`);
        return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_12'));
      }

      let validateResponse = oThis._validateUtilityGethParams(kind, params);

      if (validateResponse.isFailure()) {
        logger.error('Error in inserting data in config_strategies table');
        return validateResponse;
      }

      let configStrategyModelObj = new ConfigStrategyModel();

      insertResponse = await configStrategyModelObj.create(kind, managedAddressSaltId, params, groupId);

      if (insertResponse.isFailure()) {
        logger.error('Error while inserting data in config strategy table ');
        return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_13'));
      }
    }

    return Promise.resolve(insertResponse);
  }

  /**
   * Sets the status of given strategy id as active.
   *
   * @param {number}strategy_id - strategy_id from config_strategies table
   * @returns {Promise<*>}
   */
  async activateByStrategyId(strategy_id) {
    const oThis = this,
      activeStatus = configStrategyConstants.invertedStatuses[configStrategyConstants.activeStatus],
      strategyId = strategy_id;

    let queryResponse = await new ConfigStrategyModel()
      .update({ status: activeStatus })
      .where(['id = ?', strategyId])
      .fire();

    if (!queryResponse) {
      logger.error('Error in setStatusActive');
      return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_14'));
    }
    if (queryResponse.affectedRows === 1) {
      logger.info(`Status of strategy id: [${strategyId}] is now active.`);
      return Promise.resolve(responseHelper.successWithData({}));
    } else {
      logger.error('Strategy Id not present in the table');
      return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_15'));
    }
  }

  /**
   * This function updates and sets status 'active' for given group_id.
   *
   * @returns {Promise<*>}
   */
  async activate() {
    const oThis = this,
      activeStatus = configStrategyConstants.invertedStatuses[configStrategyConstants.activeStatus],
      groupId = oThis.groupId;

    if (groupId === undefined) {
      logger.error(`Group id is mandatory for this function.`);
      return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_16'));
    }

    //This query includes NULL value of group_ids. This is done to activate the strategies for which group_ids are not needed.
    let strategyIdResponse = await new ConfigStrategyModel()
      .update({ status: activeStatus })
      .where(['group_id = ? OR group_id IS NULL', groupId])
      .fire();

    if (strategyIdResponse) {
      logger.info(`Group id [${groupId}] successfully activated.`);
      //return Promise.resolve(responseHelper.successWithData({}));
    } else {
      logger.error('Error while activating strategy');
      return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_17'));
    }

    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   * This function deactivates strategies of given group id.
   *
   * 1. get all strategy ids for the given group_id.
   * 2. Check if any row contains these strategy ids in client_config_strategies table.
   * 3. Only if response array's length is 0. then deactivate those group ids.
   *
   * @returns {Promise<*>}
   */
  async deactivate() {
    const oThis = this,
      groupId = oThis.groupId;

    if (groupId === undefined) {
      logger.error(`Group id is mandatory for this function.`);
      return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_18'));
    }

    let whereClause = ['group_id = ?', groupId],
      distinctStrategyIdArray = await oThis._strategyIdsArrayProvider(whereClause);

    //Check in client_config_strategy if those strategy ids exist in the table then don't deactivate those group ids.

    let clientIdQueryResponse = await new ClientConfigStrategyModel()
      .select(['client_id'])
      .where(['config_strategy_id IN (?)', distinctStrategyIdArray])
      .fire();

    if (clientIdQueryResponse.length > 0) {
      logger.error(`The given group id [${groupId}] has been assigned to some existing clients. Cannot deactivate`);
      return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_19'));
    }

    //now set status as inactive
    let inActiveStatus = configStrategyConstants.invertedStatuses[configStrategyConstants.inActiveStatus],
      queryResponse = await new ConfigStrategyModel()
        .update({ status: inActiveStatus })
        .where(['group_id = ?', groupId])
        .fire();

    if (!queryResponse) {
      logger.error('Error in Deactivating group id');
      return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_20'));
    }
    if (queryResponse.affectedRows > 0) {
      logger.info(`Status of group id: [${groupId}] is now deactive.`);
      //return Promise.resolve(responseHelper.successWithData({}));
    } else {
      logger.error('Strategy Id not present in the table');
      return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_21'));
    }

    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   * This function updates the strategy id for the given kind.
   * If chain_geth_providers table is to be updated then
   * If the kind is to be updated is value_geth or utility_geth the old_data parameters
   * @param {string} kind
   * @param params
   * @param {object} OPTIONAL old_data (old_data = {'WS_Provider': '127.0.0.1:8545','RPC_Provider':'127.0.0.1:1845' }). This the old
   * data which is to be replaced.
   * @returns {Promise<never>}
   */
  async updateForKind(kind, params, old_data) {
    const oThis = this,
      groupId = oThis.groupId,
      strategyIdInt = configStrategyConstants.invertedKinds[kind];

    if (strategyIdInt === undefined) {
      logger.error('Provided kind is not proper. Please check kind');
      return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_22'));
    }

    let whereClause = null;
    if (configStrategyConstants.kindsWithoutGroupId.includes(kind)) {
      //Should not have group id
      if (groupId) {
        logger.error(`To insert [${kind}] group id is not required.`);
        return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_23'));
      }

      whereClause = ['group_id IS NULL AND kind = ?', strategyIdInt];
    } else {
      //should have group id
      if (groupId === undefined) {
        logger.error(`To insert [${kind}] group id is mandatory.`);
        return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_24'));
      }

      whereClause = ['group_id = ? AND kind = ?', groupId, strategyIdInt];
    }

    let existingData = await new ConfigStrategyModel()
      .select(['id', 'status'])
      .where(whereClause)
      .fire();

    if (existingData.length === 0) {
      logger.error('Strategy Id for the provided kind not found OR kind for the given group id does not exist');
      return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_25'));
    }

    if (existingData.length > 1) {
      logger.error('Multiple entries(rows) found for the same group id and kind combination');
      return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_26'));
    }

    let currentStatus = existingData[0].status,
      existingStrategyId = existingData[0].id;

    let configStrategyFetchCacheObj = new configStrategyCacheKlass({ strategyIds: [existingStrategyId] }),
      configStrategyFetchRsp = await configStrategyFetchCacheObj.fetch(),
      existingDataInDb = configStrategyFetchRsp.data[existingStrategyId][kind];

    if (currentStatus == configStrategyConstants.invertedStatuses[configStrategyConstants.activeStatus]) {
      //Check whitelisting only when its status is active.
      let whiteListingCheckResponse = await oThis._checkForWhiteListing(existingDataInDb, params, kind);
      if (whiteListingCheckResponse.isFailure()) {
        return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_34'));
      }
    }

    let validateResponse = oThis._validateUtilityGethParams(kind, params);

    if (validateResponse.isFailure()) {
      logger.error('Error in inserting data in config_strategies table');
      return validateResponse;
    }

    let configStrategyModelObj = new ConfigStrategyModel(),
      updateResponse = await configStrategyModelObj.updateStrategyId(existingStrategyId, params);

    if (updateResponse.isFailure()) {
      logger.error('Error while updating data in config strategy table ');
      return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_27'));
    }

    //clearing the cache
    let configStrategyCacheObj = new configStrategyCacheKlass({ strategyIds: [existingStrategyId] }),
      configStrategyRsp = await configStrategyCacheObj.clear();

    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   * This function returns an array of all the strategy kinds.
   * @returns {array}
   */
  getAllKinds() {
    let kindsHash = configStrategyConstants.kinds,
      kindsArray = Object.values(kindsHash);

    return kindsArray;
  }

  async getStrategyIds() {
    const oThis = this;
    let groupId = oThis.groupId;

    if (groupId === undefined) {
      logger.error(`Group id is mandatory.`);
      return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_29'));
    }

    let whereClause = ['group_id = ? OR group_id IS NULL', groupId],
      strategyIdArray = await oThis._strategyIdsArrayProvider(whereClause);

    if (strategyIdArray.length > 0) {
      return Promise.resolve(responseHelper.successWithData(strategyIdArray));
    } else {
      logger.error('Error in fetching strategyIds');
      return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_30'));
    }
  }

  /**
   * This function helps in preparing flat hash from the response given by cache
   * @param configStrategyResponse
   * @param gethEndPointType - read_only or read_write(DEFAULT value)
   * @private
   */
  _cacheResponseFlatHashProvider(configStrategyResponse, gethEndPointType) {
    const oThis = this;

    let configStrategyIdToDetailMap = configStrategyResponse.data,
      finalConfigStrategyFlatHash = {};

    gethEndPointType = gethEndPointType ? gethEndPointType : 'read_write';

    for (let configStrategyId in configStrategyIdToDetailMap) {
      let configStrategy = configStrategyIdToDetailMap[configStrategyId];

      for (let strategyKind in configStrategy) {
        let partialConfig = configStrategy[strategyKind];

        if (strategyKind == 'utility_geth') {
          let tempConfig = partialConfig[gethEndPointType];
          delete partialConfig['read_write'];
          delete partialConfig['read_only'];
          Object.assign(partialConfig, tempConfig);
        }

        Object.assign(finalConfigStrategyFlatHash, partialConfig);
      }
    }

    return finalConfigStrategyFlatHash;
  }

  /**
   * This function returns config strategy of the strategy ids passed as argument
   * @param {array}strategyIdsArray
   * @returns {Promise<*>}
   * @private
   */
  async _getConfigStrategyByStrategyId(strategyIdsArray) {
    let configStrategyCacheObj = new configStrategyCacheKlass({ strategyIds: strategyIdsArray }),
      configStrategyFetchRsp = await configStrategyCacheObj.fetch();

    if (configStrategyFetchRsp.isFailure()) {
      logger.error('Error in fetching config strategy from cache');
      return Promise.reject(configStrategyFetchRsp);
    }

    return Promise.resolve(responseHelper.successWithData(configStrategyFetchRsp.data));
  }

  /**
   * It returns strategyIdsArray from query on Config Strategy Model.
   * @param whereClause - whereClause for query on Config Strategy Model
   * @returns {Promise<*>}
   * @private
   */
  async _strategyIdsArrayProvider(whereClause) {
    if (!whereClause || whereClause === undefined) {
      logger.error('whereClause is not provided.');
      return Promise.reject(whereClause);
    }

    let strategyIdResponse = await new ConfigStrategyModel()
      .select(['id'])
      .where(whereClause)
      .fire();

    let strategyIdsArray = [];

    for (let index in strategyIdResponse) {
      strategyIdsArray.push(strategyIdResponse[index].id);
    }

    return strategyIdsArray;
  }

  /**
   *
   * @param error_code
   * @private
   */
  async _errorResponseHandler(error_code) {
    return responseHelper.error({
      internal_error_identifier: error_code,
      api_error_identifier: 'something_went_wrong',
      debug_options: {}
    });
  }

  /**
   * Validate utility geth hash - check if providers array has all keys and it is of correct data type.
   */
  _validateUtilityGethParams(kind, params) {
    const oThis = this,
      validKeys = ['read_only', 'read_write', 'OST_UTILITY_CHAIN_ID'];

    if (kind == 'utility_geth') {
      let keys = Object.keys(params);

      for (let i = 0; i < validKeys.length; i++) {
        if (!keys.includes(validKeys[i])) {
          logger.error('Missing', validKeys[i], ' key in the input params');
          return oThis._errorResponseHandler('h_cs_bgi_31');
        }
      }

      for (let i = 0; i < keys.length; i++) {
        if (['read_only', 'read_write'].includes(keys[i])) {
          if (
            !(params[keys[i]].OST_UTILITY_GETH_RPC_PROVIDERS instanceof Array) ||
            !(params[keys[i]].OST_UTILITY_GETH_WS_PROVIDERS instanceof Array)
          ) {
            logger.error('Expecting', keys[i], "key's value to be an array");
            return oThis._errorResponseHandler('h_cs_bgi_32');
          }
        }
      }
    }

    return responseHelper.successWithData({});
  }

  _checkForWhiteListing(existingDataInDb, params, kind) {
    const oThis = this;

    let whiteListedKeysForKind = configStrategyConstants.whiteListedKeys[kind];

    if (whiteListedKeysForKind === undefined) {
      logger.error(`Updating ${kind} is not allowed when its status is active. Either deactivate it or add the kinds
       and its keys in the whitelist present in global constants`);
      return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_35'));
    }

    for (let key in existingDataInDb) {
      if (!whiteListedKeysForKind.includes(key)) {
        //Since key not present in whitelisted entries Thus values should be similar.
        if (existingDataInDb[key] !== params[key]) {
          logger.error('Attempt to edit keys which are not whitelisted.');
          logger.error('Only these keys are editable when kind is active: ', whiteListedKeysForKind);
          return Promise.reject(oThis._errorResponseHandler('h_cs_bgi_33'));
        }
      }
    }

    return Promise.resolve(responseHelper.successWithData({}));
  }

}

module.exports = ConfigStrategyByGroupId;
