'use strict';
/**
 * Config formatter
 *
 * @module lib/formatter/config
 */
const rootPrefix = '../..',
  OSTBase = require("@openstfoundation/openst-base"),
  InstanceComposer = OSTBase.InstanceComposer,
  cacheManagementConstants = require(rootPrefix + '/lib/globalConstant/cacheManagement');

/**
 * Class for config formatter
 *
 * @class
 */
class ConfigFormatter {
  /**
   * Constructor for config formatter
   *
   * @param {Object} configStrategy
   * @param {Object} instanceComposer
   * @constructor
   */
  constructor(configStrategy, instanceComposer) {
    const oThis = this;
    let chainIdConfigMap = {};
    for (let i = 0; i < configStrategy.chains.length; i++) {
      let currConfig = configStrategy.chains[i];

      chainIdConfigMap[currConfig.chainId] = currConfig;
    }
    oThis.chainIdConfigMap = chainIdConfigMap;
  }

  /**
   * Get config for a particular chain id
   *
   * @param {Number} chainId: chain Id to find config for
   * @returns {Object}: config for a particular chain id
   */
  configFor(chainId) {
    const oThis = this;

    return oThis.chainIdConfigMap[chainId];
  }

  /**
   * Format cache config
   *
   * @returns {Object}: returns formatted config
   */
  formatCacheConfig(config) {
    const cacheConfig = {
      OST_CACHING_ENGINE: config.engine,
      OST_DEFAULT_TTL: config.defaultTtl,
      OST_CACHE_CONSISTENT_BEHAVIOR: 1
    };
    switch (config.engine) {
      case cacheManagementConstants.memcached:
        cacheConfig.OST_MEMCACHE_SERVERS = config.servers.join(',');
        break;
      case cacheManagementConstants.redis:
        cacheConfig.OST_REDIS_HOST = config.host;
        cacheConfig.OST_REDIS_PORT = config.port;
        cacheConfig.OST_REDIS_PASS = config.password;
        cacheConfig.OST_REDIS_TLS_ENABLED = config.enableTls;
        break;
      case cacheManagementConstants.inMemory:
        break;
      default:
        throw `unsupported ${config.engine}`;
    }
    return cacheConfig;
  }

  /**
   * Format storage config
   *
   * @param {Object} config: config to format
   * @returns {Object}: returns formatted config
   */
  formatStorageConfig(config) {
    return {
      OS_DYNAMODB_SECRET_ACCESS_KEY: config.apiSecret,
      OS_DYNAMODB_ACCESS_KEY_ID: config.apiKey,
      OS_DYNAMODB_SSL_ENABLED: config.enableSsl,
      OS_DYNAMODB_ENDPOINT: config.endpoint,
      OS_DYNAMODB_API_VERSION: config.apiVersion,
      OS_DYNAMODB_REGION: config.region,
      OS_DYNAMODB_LOGGING_ENABLED: config.enableLogging,
      OS_DYNAMODB_TABLE_NAME_PREFIX: '',
      OS_DAX_ENABLED: 0,

      OS_AUTOSCALING_SECRET_ACCESS_KEY: config.autoScaling.apiSecret,
      AUTO_SCALE_DYNAMO: config.enableAutoscaling,
      OS_AUTOSCALING_API_VERSION: config.autoScaling.apiVersion,
      OS_AUTOSCALING_ACCESS_KEY_ID: config.autoScaling.apiKey,
      OS_AUTOSCALING_REGION: config.autoScaling.region,
      OS_AUTOSCALING_ENDPOINT: config.autoScaling.endpoint,
      OS_AUTOSCALING_SSL_ENABLED: config.autoScaling.enableSsl,
      OS_AUTOSCALING_LOGGING_ENABLED: config.enableLogging
    };
  }
  /**
   * return extra column config for a given table name
   *
   * @param {Object} tableIdentifier
   *
   * @returns {Object}
   */
  getExtraColumnConfigFor(tableIdentifier) {
    const oThis = this,
      configStrategy = oThis.ic().configStrategy,
      extraStorageColumns = configStrategy['extraStorageColumns'] || {};
    return extraStorageColumns[tableIdentifier] || {};
  }
}

InstanceComposer.registerAsObject(ConfigFormatter, 'saas::SaasNamespace', 'configFormatter', true);

module.exports = ConfigFormatter;
