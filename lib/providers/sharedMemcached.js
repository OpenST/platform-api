const OSTCache = require('@ostdotcom/cache');

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  cacheManagementConstants = require(rootPrefix + '/lib/globalConstant/cacheManagement');

/**
 * Class for shared memcache provider.
 *
 * @class CacheProvider
 */
class CacheProvider {
  /**
   * Get instance of ost-cache.
   *
   * @param {number} cacheConsistentBehavior
   *
   * @returns {object}
   */
  getInstance(cacheConsistentBehavior) {
    const cacheConfigStrategy = {
      cache: {
        engine: cacheManagementConstants.memcached,
        servers: coreConstants.SHARED_MEMCACHE_SERVERS,
        defaultTtl: '86400',
        consistentBehavior: cacheConsistentBehavior
      }
    };

    return OSTCache.getInstance(cacheConfigStrategy);
  }
}

module.exports = new CacheProvider();
