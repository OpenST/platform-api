'use strict';
/**
 * Nonce memcache OpenStCache Provider
 *
 * @module lib/providers/nonceMemcached
 */
const OSTBase = require('@openstfoundation/openst-base'),
  OpenStCache = require('@openstfoundation/openst-cache'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

/**
 * Class for client specific openst-cache provider.
 *
 * @class
 */
class NonceCacheProviderKlass {
  /**
   * Constructor for client specific openst-cache provider.
   *
   * @param {Object} configStrategy
   * @param {Object} instanceComposer
   *
   * @constructor
   */
  constructor(configStrategy, instanceComposer) {}

  /**
   * Get provider
   *
   * @param {Number} cacheConsistentBehavior
   *
   * @returns {Object}
   */
  getInstance(cacheConsistentBehavior) {
    const oThis = this,
      configStrategy = oThis.ic().configStrategy;

    let cacheConfigStrategy = {
      cache: {
        engine: cacheManagementConst.memcached,
        servers: configStrategy[configStrategyConstants.globalNonceMemcached].servers
      }
    };

    cacheConfigStrategy.OST_DEFAULT_TTL = configStrategy[configStrategyConstants.globalNonceMemcached].defaultTtl;
    cacheConfigStrategy.OST_CACHE_CONSISTENT_BEHAVIOR = cacheConsistentBehavior;

    return OpenStCache.getInstance(cacheConfigStrategy);
  }
}

InstanceComposer.registerAsObject(NonceCacheProviderKlass, coreConstants.icNameSpace, 'nonceCacheProvider', true);

module.exports = new NonceCacheProviderKlass();
