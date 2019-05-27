/**
 * This script provides config strategy on the basis of client id.
 * This provides functionality to
 * 1. Get Config Strategy Hash - get()
 * 2. Get Config Strategy Hash for given kind - getForKind()
 * 3. Get Config Strategy Ids for given kind - getStrategyIdForKind()
 *
 * @module helpers/configStrategy/ByClientId
 */

const rootPrefix = '../..',
  ConfigStrategyCache = require(rootPrefix + '/lib/cacheManagement/sharedMulti/ConfigStrategy'),
  ClientConfigGroupCache = require(rootPrefix + '/lib/cacheManagement/shared/ClientConfigGroup'),
  ChainConfigStrategyIds = require(rootPrefix + '/lib/cacheManagement/shared/ChainConfigStrategyId'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

const errorConfig = basicHelper.fetchErrorConfig(apiVersions.general);

/**
 * Class to fetch config strategy by client Id.
 *
 * @class ConfigStrategyByClientId
 */
class ConfigStrategyByClientId {
  /**
   * Constructor to fetch config strategy by client Id.
   *
   * @param {number} clientId
   *
   * @constructor
   */
  constructor(clientId) {
    const oThis = this;

    oThis.clientId = clientId;
  }

  /**
   * Get final hash of config strategy.
   *
   * @returns {Promise<>}
   */
  async get() {
    const oThis = this;

    const clientId = oThis.clientId;

    if (clientId === undefined) {
      return oThis._customError(
        'h_cs_bci_1',
        'client Id is not defined. To get complete hash client id is compulsory.'
      );
    }

    const clientConfigStrategyCacheObj = new ClientConfigGroupCache({ clientId: clientId }),
      fetchCacheRsp = await clientConfigStrategyCacheObj.fetch();

    if (fetchCacheRsp.isFailure()) {
      return Promise.reject(fetchCacheRsp);
    }

    const cacheData = fetchCacheRsp.data[clientId],
      cachedChainId = cacheData.chainId;

    const chainConfigStrategyIdsObj = new ChainConfigStrategyIds({ chainId: cachedChainId }),
      chainConfigStrategyIdsCacheRsp = await chainConfigStrategyIdsObj.fetch();

    const strategyIdsArray = chainConfigStrategyIdsCacheRsp.data.strategyIds,
      configStrategyCacheObj = new ConfigStrategyCache({ strategyIds: strategyIdsArray }),
      configStrategyFetchRsp = await configStrategyCacheObj.fetch();

    if (configStrategyFetchRsp.isFailure()) {
      return Promise.reject(configStrategyFetchRsp);
    }

    const finalConfigHash = {},
      configStrategyIdToDetailMap = configStrategyFetchRsp.data;

    for (const configStrategyId in configStrategyIdToDetailMap) {
      Object.assign(finalConfigHash, configStrategyIdToDetailMap[configStrategyId]);
    }

    return Promise.resolve(responseHelper.successWithData(finalConfigHash));
  }

  /**
   * This function returns array of read-write type of endpoints from client config.
   *
   * @return {Promise<>}
   */
  async getAuxProviders() {
    const oThis = this;

    const configResponse = await oThis.get(),
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

module.exports = ConfigStrategyByClientId;
