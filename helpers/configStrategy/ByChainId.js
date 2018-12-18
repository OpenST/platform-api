'use strict';
/**
 * CRUD for config_strategies table
 * This provides functionality to
 * 1. Get Config Strategy Hash - getCompleteHash, getForKind, getByChainId
 * 2. Add Config Strategy for given kind - addForKind
 * 3. Set status active/inactive - activateByStrategyId, activate, deactivate
 * 4. Update strategy for given kind - updateForKind
 * 5. Get all strategy kinds present - getAllKinds
 * @module helpers/configStrategy/ByChainId
 */
const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ConfigStrategyModel = require(rootPrefix + '/app/models/mysql/ConfigStrategy'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  ClientConfigStrategyModel = require(rootPrefix + '/app/models/mysql/ClientConfigStrategies'),
  ConfigStrategyCache = require(rootPrefix + '/lib/sharedCacheMultiManagement/configStrategy'),
  configStrategyValidator = require(rootPrefix + '/lib/validators/configStrategy');

/**
 * Class for config strategy by chain id helper.
 *
 * @class
 */
class ConfigStrategyByChainId {
  /**
   * Constructor for config strategy by chain id helper.
   *
   * @param {Number} [chainId]
   * @param {Number} [groupId]
   *
   * @constructor
   */
  constructor(chainId, groupId) {
    const oThis = this;

    oThis.chainId = chainId;
    oThis.groupId = groupId;
  }

  /**
   * Get Hash of Config specific to the chain
   *
   * @returns {Promise}
   */
  get() {
    const oThis = this;

    return oThis._fetchAndCombineConfig(['chain_id = ?', oThis.chainId]);
  }

  /**
   *
   * @returns {Promise<*>}
   */
  getComplete() {
    const oThis = this;

    // where chain id is the one passed here OR 0
    return oThis._fetchAndCombineConfig(['chain_id = ? OR chain_id = 0', oThis.chainId]);
  }

  /**
   * Get config for a kind and a chain id
   *
   * @param {String} kind
   *
   * @returns {Promise<*>}
   */
  async getForKind(kind) {
    const oThis = this,
      chainId = oThis.chainId;

    let strategyKindIntValue = await configStrategyValidator.getStrategyKindInt(kind);

    await configStrategyValidator.validateChainIdKindCombination(kind, chainId);

    return oThis._fetchAndCombineConfig(['chain_id = ? AND kind = ?', chainId, strategyKindIntValue]);
  }

  /**
   * Get for kind - rows which have active status
   *
   * @param kind {Number} - kind
   *
   * @returns {Promise<any>}
   */
  async getActiveByKind(kind) {
    const oThis = this;

    let strategyKindIntValue = await configStrategyValidator.getStrategyKindInt(kind),
      activeStatus = configStrategyConstants.invertedStatuses[configStrategyConstants.activeStatus];

    return oThis._fetchAndCombineConfig([
      'chain_id = ? AND kind = ? AND status = ?',
      oThis.chainId,
      strategyKindIntValue,
      activeStatus
    ]);
  }

  /**
   * Activate by config strategy id
   *
   * @param strategyId
   * @returns {Promise<*>}
   */
  activateByStrategyId(strategyId) {
    return new ConfigStrategyModel().activateById(strategyId);
  }

  /**
   * This function updates and sets status 'active' for given chain_id.
   *
   * @returns {Promise<*>}
   */
  async activate() {
    const oThis = this,
      activeStatus = configStrategyConstants.invertedStatuses[configStrategyConstants.activeStatus];

    let strategyIdResponse = await new ConfigStrategyModel()
      .update({ status: activeStatus })
      .where(['chain_id = ?', oThis.chainId])
      .fire();

    if (strategyIdResponse.affectedRows <= 0) {
      return Promise.reject(oThis._customError('h_cs_bgi_17', 'Error while activating strategy'));
    }

    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   * Deactivate
   *
   * @returns {Promise<*>}
   */
  async deactivate() {
    const oThis = this,
      chainId = oThis.chainId;

    let whereClause = ['chain_id = ?', chainId],
      configStrategyIds = await oThis._strategyIdsArrayProvider(whereClause);

    //Check in client_config_strategies. If association found, don't deactivate
    let clientIdQueryResponse = await new ClientConfigStrategyModel()
      .select(['client_id'])
      .where(['config_strategy_id IN (?)', configStrategyIds])
      .fire();

    if (clientIdQueryResponse.length > 0) {
      return Promise.reject(
        oThis._customError(
          'h_cs_bgi_19',
          `The given chain id [${chainId}] has been assigned to some existing clients. Cannot deactivate`
        )
      );
    }

    //now set status as inactive
    let inActiveStatus = configStrategyConstants.invertedStatuses[configStrategyConstants.inActiveStatus];

    let queryResponse = await new ConfigStrategyModel()
      .update({ status: inActiveStatus })
      .where(['chain_id = ?', chainId])
      .fire();

    if (!queryResponse) {
      return Promise.reject(oThis._customError('h_cs_bgi_20', 'Error in Deactivating chain id'));
    }
    if (queryResponse.affectedRows > 0) {
      logger.info(`Status of chain id: [${chainId}] is now deactive.`);
      //return Promise.resolve(responseHelper.successWithData({}));
    } else {
      return Promise.reject(oThis._customError('h_cs_bgi_21', 'Strategy Id not present in the table'));
    }

    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   * Get all kinds
   *
   * @returns {Object}
   */
  getAllKinds() {
    return configStrategyConstants.kinds;
  }

  /**
   * This function adds a strategy in config_strategies table. If the kind being inserted in value_geth or utility_geth then
   * WS provider and RPC provider is also inserted in the chain_geth_providers table.
   *
   * @param {String} kind (Eg:'dynamo')
   * @param {Object} params - Hash of config params related to this kind
   * @param {Number} encryptionSaltId - managed_address_salt_id from managed_address_salt table
   * @returns {Promise<never>}
   */
  /**
   * Insert into config_strategies
   *
   * @param {String} kind: kind
   * @param {Object} allParams: all params
   * @param {Number} encryptionSaltId: encryption salt id
   *
   * @returns {Promise<*>}
   */
  async addForKind(kind, allParams, encryptionSaltId) {
    const oThis = this,
      chainId = oThis.chainId;

    let strategyKindInt = await configStrategyValidator.getStrategyKindInt(kind);

    await configStrategyValidator.validateChainIdKindCombination(kind, chainId);

    // Check if kind is already present for this chain id. If yes, reject.
    let whereClause = ['chain_id = ? AND kind = ?', chainId, strategyKindInt],
      queryResponse = await oThis._strategyIdsArrayProvider(whereClause);

    if (queryResponse.length > 0) {
      return Promise.reject(
        oThis._customError('h_cs_bgi_12', `chain Id [${chainId}] with kind [${kind}] already exists in the table.`)
      );
    }

    return new ConfigStrategyModel().create(kind, chainId, oThis.groupId, allParams, encryptionSaltId);
  }

  /**
   * Update Strategy by kind and chain id.
   *
   * @param kind {String}
   * @param params {Object}
   *
   * @returns {Promise<>}
   */
  async updateForKind(kind, params) {
    const oThis = this;

    let strategyKindInt = await configStrategyValidator.getStrategyKindInt(kind);

    await configStrategyValidator.validateChainIdKindCombination(kind, oThis.chainId);

    let existingData = await new ConfigStrategyModel()
      .select(['id', 'status'])
      .where(['chain_id = ? AND kind = ?', oThis.chainId, strategyKindInt])
      .fire();

    if (existingData.length === 0) {
      return Promise.reject(
        oThis._customError(
          'h_cs_bgi_25',
          'Strategy Id for the provided kind not found OR kind for the given chain id does not exist'
        )
      );
    }

    if (existingData.length > 1) {
      return Promise.reject(
        oThis._customError('h_cs_bgi_26', 'Multiple entries(rows) found for the same chain id and kind combination')
      );
    }

    let existingStrategyId = existingData[0].id;

    await new ConfigStrategyModel().updateStrategyId(existingStrategyId, params);

    //clearing the cache
    let configStrategyCacheObj = new ConfigStrategyCache({ strategyIds: [existingStrategyId] });
    await configStrategyCacheObj.clear();

    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   *  Get strategy ids of a chain.
   *
   * @returns {Promise<>}
   */
  async getStrategyIds() {
    const oThis = this;
    let chainId = oThis.chainId;

    if (chainId === undefined) {
      return oThis._customError('h_cs_bgi_29', 'Chain id is mandatory.');
    }

    let whereClause = ['chain_id = ? OR chain_id = 0', chainId],
      strategyIdArray = await oThis._strategyIdsArrayProvider(whereClause);

    if (strategyIdArray.length > 0) {
      return Promise.resolve(responseHelper.successWithData(strategyIdArray));
    } else {
      return oThis._customError('h_cs_bgi_30', 'Error in fetching strategyIds');
    }
  }

  /**
   * This function returns config strategy of the strategy ids passed as argument
   * @param {Array}strategyIdsArray
   * @returns {Promise<*>}
   * @private
   */
  async _getConfigStrategyByStrategyId(strategyIdsArray) {
    let configStrategyCacheObj = new ConfigStrategyCache({ strategyIds: strategyIdsArray }),
      configStrategyFetchRsp = await configStrategyCacheObj.fetch();

    if (configStrategyFetchRsp.isFailure()) {
      logger.error('Error in fetching config strategy from cache');
      return Promise.reject(configStrategyFetchRsp);
    }

    return Promise.resolve(responseHelper.successWithData(configStrategyFetchRsp.data));
  }

  /**
   * It returns strategyIdsArray from query on Config Strategy Model.
   *
   * @param whereClause
   * @returns {Promise<>}
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
   * Given a where clause, fetch all the config rows and merge them and return the final hash
   *
   * @param whereClause {Array} - where clause
   *
   * @returns {Promise<any>}
   *
   * @private
   */
  async _fetchAndCombineConfig(whereClause) {
    const oThis = this;

    let finalConfigHash = {},
      strategyIdsArray = await oThis._strategyIdsArrayProvider(whereClause),
      configCacheResponse = await oThis._getConfigStrategyByStrategyId(strategyIdsArray),
      cacheConfig = configCacheResponse.data;

    for (let i = 0; i < strategyIdsArray.length; i++) {
      Object.assign(finalConfigHash, cacheConfig[strategyIdsArray[i]]);
    }

    return responseHelper.successWithData(finalConfigHash);
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
        debug_options: { errMsg: errMsg },
        error_config: errorConfig
      })
    );
  }
}

module.exports = ConfigStrategyByChainId;
