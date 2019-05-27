/**
 * Module to fetch config strategy by chainId.
 *
 * @module helpers/configStrategy/ByChainId
 */

const rootPrefix = '../..',
  ConfigStrategyModel = require(rootPrefix + '/app/models/mysql/ConfigStrategy'),
  ConfigStrategyCache = require(rootPrefix + '/lib/cacheManagement/sharedMulti/ConfigStrategy'),
  ChainConfigStrategyCache = require(rootPrefix + '/lib/cacheManagement/shared/ChainConfigStrategyId'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  configValidator = require(rootPrefix + '/helpers/configValidator'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  configStrategyValidator = require(rootPrefix + '/lib/validators/configStrategy'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

const errorConfig = basicHelper.fetchErrorConfig(apiVersions.general);

/**
 * Class to fetch config strategy by chainId.
 *
 * @class ConfigStrategyByChainId
 */
class ConfigStrategyByChainId {
  /**
   * Constructor to fetch config strategy by chainId.
   *
   * @param {number} [chainId]
   * @param {number} [groupId]
   *
   * @constructor
   */
  constructor(chainId, groupId) {
    const oThis = this;

    oThis.chainId = chainId;
    oThis.groupId = groupId;
  }

  /**
   * Get hash of config specific to the chain.
   *
   * @returns {Promise}
   */
  get() {
    const oThis = this;

    return oThis._fetchAndCombineConfig(['chain_id = ?', oThis.chainId]);
  }

  /**
   * Get complete config strategy.
   *
   * @returns {Promise<*>}
   */
  getComplete() {
    const oThis = this;

    return oThis._fetchAndCombineConfig();
  }

  /**
   * Get config for a kind and a chain id.
   *
   * @param {string} kind
   *
   * @returns {Promise<*>}
   */
  async getForKind(kind) {
    const oThis = this,
      chainId = oThis.chainId;

    const strategyKindIntValue = configStrategyValidator.getStrategyKindInt(kind);

    await configStrategyValidator.validateChainIdKindCombination(kind, chainId);

    return oThis._fetchAndCombineConfig(['chain_id = ? AND kind = ?', chainId, strategyKindIntValue]);
  }

  /**
   * Get for kind: rows which have active status.
   *
   * @param {string} kind
   *
   * @returns {Promise<any>}
   */
  async getActiveByKind(kind) {
    const oThis = this;

    const strategyKindIntValue = configStrategyValidator.getStrategyKindInt(kind),
      activeStatus = configStrategyConstants.invertedStatuses[configStrategyConstants.activeStatus];

    return oThis._fetchAndCombineConfig([
      'chain_id = ? AND kind = ? AND status = ?',
      oThis.chainId,
      strategyKindIntValue,
      activeStatus
    ]);
  }

  /**
   * Activate by config strategy id.
   *
   * @param {number} strategyId
   *
   * @returns {Promise<*>}
   */
  activateByStrategyId(strategyId) {
    return new ConfigStrategyModel().activateById(strategyId);
  }

  /**
   * This function checks if mandatory kinds are present for given chain.
   * If not, then activation can not be performed else updates and sets status 'active' for given chain_id.
   *
   * @returns {Promise<*>}
   */
  async activate() {
    const oThis = this,
      activeStatus = configStrategyConstants.invertedStatuses[configStrategyConstants.activeStatus];

    let mandatoryKinds = [];
    const mandatoryKindsMap = configStrategyConstants.mandatoryKinds,
      configResponse = await oThis.getComplete(),
      config = configResponse.data;

    // Check which kind of chain, we need to validate and activate
    if (oThis.chainId == 0) {
      mandatoryKinds = mandatoryKindsMap[configStrategyConstants.globalMandatoryKind];
    } else {
      mandatoryKinds = mandatoryKindsMap[configStrategyConstants.auxMandatoryKind];
    }

    for (let index = 0; index < mandatoryKinds.length; index++) {
      const kindToCheck = mandatoryKinds[index];

      // Check if config is inserted.
      if (
        config[kindToCheck] === undefined ||
        !(config[kindToCheck] instanceof Object) ||
        Object.keys(config[kindToCheck]) < 1
      ) {
        return oThis._customError(
          'h_cs_bgi_18',
          'Can not activate without inserting kinds first, Missing Kind: ' + kindToCheck
        );
      }

      // Validate config.
      if (!configValidator.validateConfigStrategy(kindToCheck, config)) {
        return oThis._customError('h_cs_bgi_19', 'Config params validation failed for: ' + JSON.stringify(config));
      }
    }

    // Update if above validations are successful.
    const strategyIdResponse = await new ConfigStrategyModel()
      .update({ status: activeStatus })
      .where(['chain_id = ?', oThis.chainId])
      .fire();

    if (strategyIdResponse.affectedRows <= 0) {
      return Promise.reject(oThis._customError('h_cs_bgi_17', 'Error while activating strategy'));
    }

    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   * Deactivate config strategy.
   *
   * @returns {Promise<*>}
   */
  async deactivate() {
    const oThis = this,
      chainId = oThis.chainId;

    // TODO:: Check in config strategy association already found, don't deactivate

    // Now set status as inactive.
    const inActiveStatus = configStrategyConstants.invertedStatuses[configStrategyConstants.inActiveStatus];

    const queryResponse = await new ConfigStrategyModel()
      .update({ status: inActiveStatus })
      .where(['chain_id = ?', chainId])
      .fire();

    if (!queryResponse) {
      return Promise.reject(oThis._customError('h_cs_bgi_20', 'Error in Deactivating chain id'));
    }
    if (queryResponse.affectedRows > 0) {
      logger.info(`Status of chain id: [${chainId}] is now deactive.`);

      return Promise.resolve(responseHelper.successWithData({}));
    }

    return Promise.reject(oThis._customError('h_cs_bgi_21', 'Strategy Id not present in the table'));
  }

  /**
   * Get all kinds.
   *
   * @returns {object}
   */
  getAllKinds() {
    return configStrategyConstants.kinds;
  }

  /**
   * This function adds a strategy in config_strategies table. If the kind being inserted in value_geth or utility_geth then
   * WS provider and RPC provider is also inserted in the chain_geth_providers table.
   *
   * @param {string} kind (Eg:'dynamo')
   * @param {object} allParams: Hash of config params related to this kind
   * @param {number} encryptionSaltId: encryption salt id
   *
   * @returns {Promise}
   */
  async addForKind(kind, allParams, encryptionSaltId) {
    const oThis = this,
      chainId = oThis.chainId;

    const strategyKindInt = configStrategyValidator.getStrategyKindInt(kind);

    await configStrategyValidator.validateChainIdKindCombination(kind, chainId);

    // Check if kind is already present for this chain id. If yes, reject.
    const whereClause = ['chain_id = ? AND kind = ?', chainId, strategyKindInt],
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
   * @param {string} kind
   * @param {object} params
   *
   * @returns {Promise<>}
   */
  async updateForKind(kind, params) {
    const oThis = this;

    const strategyKindInt = configStrategyValidator.getStrategyKindInt(kind);

    await configStrategyValidator.validateChainIdKindCombination(kind, oThis.chainId);

    const existingData = await new ConfigStrategyModel()
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

    const existingStrategyId = existingData[0].id;

    await new ConfigStrategyModel().updateStrategyId(existingStrategyId, params);

    // Clearing the cache.
    const configStrategyCacheObj = new ConfigStrategyCache({ strategyIds: [existingStrategyId] });
    await configStrategyCacheObj.clear();

    return Promise.resolve(responseHelper.successWithData({}));
  }

  /**
   * Get strategy ids of a chain.
   *
   * @returns {Promise<>}
   */
  async getStrategyIds() {
    const oThis = this;
    const chainId = oThis.chainId;

    if (chainId === undefined) {
      return oThis._customError('h_cs_bgi_29', 'Chain id is mandatory.');
    }

    const whereClause = ['chain_id = ? OR chain_id = 0', chainId],
      strategyIdArray = await oThis._strategyIdsArrayProvider(whereClause);

    if (strategyIdArray.length > 0) {
      return Promise.resolve(responseHelper.successWithData(strategyIdArray));
    }

    return oThis._customError('h_cs_bgi_30', 'Error in fetching strategyIds');
  }

  /**
   * This function returns config strategy of the strategy ids passed as argument.
   *
   * @param {array} strategyIdsArray
   *
   * @returns {Promise<*>}
   * @private
   */
  async _getConfigStrategyByStrategyId(strategyIdsArray) {
    const configStrategyCacheObj = new ConfigStrategyCache({ strategyIds: strategyIdsArray }),
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
   * @param {array} whereClause
   *
   * @returns {Promise<>}
   * @private
   */
  async _strategyIdsArrayProvider(whereClause) {
    if (!whereClause || whereClause === undefined) {
      logger.error('whereClause is not provided.');

      return Promise.reject(whereClause);
    }

    const strategyIdResponse = await new ConfigStrategyModel()
      .select(['id'])
      .where(whereClause)
      .fire();

    const strategyIdsArray = [];

    for (const index in strategyIdResponse) {
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

    const chainConfigStrategyCache = new ChainConfigStrategyCache({ chainId: oThis.chainId });

    const chainConfigCacheRsp = await chainConfigStrategyCache.fetch();

    return chainConfigCacheRsp.data.strategyIds;
  }

  /**
   * Given a where clause, fetch all the config rows and merge them and return the final hash
   *
   * @param {array} [whereClause]
   *
   * @returns {Promise<any>}
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

    const finalConfigHash = {},
      configCacheResponse = await oThis._getConfigStrategyByStrategyId(strategyIdsArray),
      cacheConfig = configCacheResponse.data;

    for (let index = 0; index < strategyIdsArray.length; index++) {
      Object.assign(finalConfigHash, cacheConfig[strategyIdsArray[index]]);
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

    const configResponse = await oThis.getComplete(),
      config = configResponse.data,
      readWriteConfig = config[configStrategyConstants.auxGeth][configStrategyConstants.gethReadWrite];

    const providers = readWriteConfig.wsProvider ? readWriteConfig.wsProviders : readWriteConfig.rpcProviders;

    return Promise.resolve(responseHelper.successWithData(providers));
  }

  /**
   * Custom error.
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
}

module.exports = ConfigStrategyByChainId;
