'use strict';
/**
 * Shared cache instance provider which is not chain specific.
 *
 * @module lib/providers/cache
 */
const rootPrefix = '../..',
  OpenStCache = require('@openstfoundation/openst-cache'),
  OSTBase = require("@openstfoundation/openst-base"),
  InstanceComposer = OSTBase.InstanceComposer,
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
   * @param {String} cacheType
   * @param {Number} chainId
   * @returns {Object}
   */
  getInstance(cacheConsistentBehavior) {
    const cacheConfigStrategy = {
      OST_CACHING_ENGINE: cacheManagementConst.memcached,
      OST_MEMCACHE_SERVERS: coreConstants.SHARED_MEMCACHE_SERVERS,
      OST_DEFAULT_TTL: '86400', //24 hours
      OST_CACHE_CONSISTENT_BEHAVIOR: cacheConsistentBehavior
    };

    return OpenStCache.getInstance(cacheConfigStrategy);
  }

}

InstanceComposer.registerAsObject(CacheProvider, 'saas::SaasNamespace', 'cacheProvider', true);

module.exports = CacheProvider;
