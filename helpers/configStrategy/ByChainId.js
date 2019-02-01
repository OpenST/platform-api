'use strict';
const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  configValidator = require(rootPrefix + '/helpers/configValidator'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  ConfigStrategyModel = require(rootPrefix + '/app/models/mysql/ConfigStrategy'),
  configStrategyValidator = require(rootPrefix + '/lib/validators/configStrategy'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  ChainConfigStrategyCache = require(rootPrefix + '/lib/cacheManagement/shared/ChainConfigStrategyIds'),
  ConfigStrategyCache = require(rootPrefix + '/lib/sharedCacheMultiManagement/configStrategy');

const errorConfig = basicHelper.fetchErrorConfig(apiVersions.general);

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

    return oThis._fetchAndCombineConfig();
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
   * This function checks if mandatory kinds are present for given chain.
   * If not, then activation can not be performed,
   * else updates and sets status 'active' for given chain_id.
   *
   * @returns {Promise<*>}
   */
  async activate() {
    const oThis = this,
      activeStatus = configStrategyConstants.invertedStatuses[configStrategyConstants.activeStatus];

    let mandatoryKinds = [],
      mandatoryKindsMap = configStrategyConstants.mandatoryKinds,
      configResponse = await oThis.getComplete(),
      config = configResponse.data;

    // check which kind of chain, we need to validate and activate
    if (oThis.chainId == 0) {
      mandatoryKinds = mandatoryKindsMap[configStrategyConstants.globalMandatoryKind];
    } else {
      mandatoryKinds = mandatoryKindsMap[configStrategyConstants.auxMandatoryKind];
    }

    for (let i = 0; i < mandatoryKinds.length; i++) {
      let kindToCheck = mandatoryKinds[i];

      // check if config is inserted
      if (
        config[kindToCheck] === undefined ||
        !config[kindToCheck] instanceof Object ||
        Object.keys(config[kindToCheck]) < 1
      ) {
        return oThis._customError(
          'h_cs_bgi_18',
          'Can not activate without inserting kinds first, Missing Kind: ' + kindToCheck
        );
      }

      // Validate config
      if (!configValidator.validateConfigStrategy(kindToCheck, config)) {
        return oThis._customError('h_cs_bgi_19', 'Config params validation failed for: ' + JSON.stringify(config));
      }
    }

    // update if above validations are successful
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

    //TODO:: Check in config strategy association already found, don't deactivate

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
   * @param {Number} encryptionSaltId - encryption salt id
   * @returns {Promise}
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
   * It returns strategyIdsArray from query on Config Strategy Model.
   *
   * @return {Promise<*[]|*|Array>}
   * @private
   */
  async _strategyIdProviderForChain() {
    const oThis = this;

    let chainConfigStrategyCache = new ChainConfigStrategyCache({ chainId: oThis.chainId });

    let chainConfigCacheRsp = await chainConfigStrategyCache.fetch();

    return chainConfigCacheRsp.data.strategyIds;
  }

  /**
   * Given a where clause, fetch all the config rows and merge them and return the final hash
   *
   * @param whereClause {Array} - where clause, optional
   *
   * @returns {Promise<any>}
   *
   * @private
   */
  async _fetchAndCombineConfig(whereClause) {
    const oThis = this;

    let strategyIdsArray = [];
    if (whereClause) {
      strategyIdsArray = await oThis._strategyIdsArrayProvider(whereClause);
    } else {
      strategyIdsArray = await oThis._strategyIdProviderForChain();
    }

    let finalConfigHash = {},
      configCacheResponse = await oThis._getConfigStrategyByStrategyId(strategyIdsArray),
      cacheConfig = configCacheResponse.data;

    for (let i = 0; i < strategyIdsArray.length; i++) {
      Object.assign(finalConfigHash, cacheConfig[strategyIdsArray[i]]);
    }

    return responseHelper.successWithData(finalConfigHash);
  }

  /**
   * This function returns array of read-write type of endpoints from client config.
   *
   * @return {Promise<>}
   */
  async getAuxProviders() {
    const oThis = this;

    let configResponse = await oThis.getComplete(),
      config = configResponse.data,
      readWriteConfig = config[configStrategyConstants.auxGeth][configStrategyConstants.gethReadWrite];

    let providers = readWriteConfig.wsProvider ? readWriteConfig.wsProviders : readWriteConfig.rpcProviders;

    return Promise.resolve(responseHelper.successWithData(providers));
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
