'use strict';

/**
 * Client specific OpenStCache Provider
 *
 * @module lib/providers/client_specific_cache_factory
 */

const rootPrefix = '../..',
  OpenStCache = require('@openstfoundation/openst-cache'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  OSTBase = require("@openstfoundation/openst-base"),
  InstanceComposer = OSTBase.InstanceComposer;

class CacheProviderKlass {

  /**
   * Constructor
   *
   * @constructor
   */
  constructor(configStrategy, instanceComposer) {}

  /**
   * Get provider
   *
   * @return {object}
   */
  getInstance(cacheType, cacheConsistentBehavior) {
    const oThis = this,
      configStrategy = oThis.ic().configStrategy;

    let cacheConfigStrategy = null;

    if (cacheManagementConst.memcached === cacheType) {
      cacheConfigStrategy = {
        OST_CACHING_ENGINE: cacheManagementConst.memcached,
        OST_MEMCACHE_SERVERS: configStrategy.OST_MEMCACHE_SERVERS
      };
    } else {
      throw `client_specific_cache_factory: Invalid cache type: ${cacheType}`;
    }
    cacheConfigStrategy.OST_DEFAULT_TTL = configStrategy.OST_DEFAULT_TTL;
    cacheConfigStrategy.OST_CACHE_CONSISTENT_BEHAVIOR = cacheConsistentBehavior;

    return OpenStCache.getInstance(cacheConfigStrategy);
  }

}

InstanceComposer.registerAsObject(CacheProviderKlass, 'saas::SaasNamespace', 'getClientSpecificCacheProvider', true);

module.exports = new CacheProviderKlass();
