'use strict';
/**
 * Shared cache instance provider which is not chain specific.
 *
 * @module lib/providers/cache
 */
const rootPrefix = '../..',
  OpenStCache = require('@openstfoundation/openst-cache'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

/**
 * Class for cache provider
 *
 * @class
 */
class CacheProvider {
  constructor() {}

  /**
   * Get instance of openst-cache.
   *
   * @returns {Object}
   */
  getInstance(cacheConsistentBehavior) {
    const cacheConfigStrategy = {
      "cache": {
        "engine": cacheManagementConst.memcached,
        "servers": coreConstants.SHARED_MEMCACHE_SERVERS,
        "defaultTtl": '86400',
        "consistentBehavior": cacheConsistentBehavior
      }
    };

    return OpenStCache.getInstance(cacheConfigStrategy);
  }

}

module.exports = new CacheProvider();
