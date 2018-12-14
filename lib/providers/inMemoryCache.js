'use strict';

/**
 * In-memory cache instance provider.
 *
 * @module /lib/providers/inMemoryCache
 */

const OpenStCache = require('@openstfoundation/openst-cache');

/**
 * Constructor
 *
 * @constructor
 */
const InMemoryCacheProviderKlass = function() {};

InMemoryCacheProviderKlass.prototype = {
  /**
   * Get provider
   *
   * @return {object}
   */
  getInstance: function(cacheConsistentBehavior) {
    const cacheConfigStrategy = {
      OST_CACHING_ENGINE: 'none',
      OST_DEFAULT_TTL: '86400', //24 hours
      OST_CACHE_CONSISTENT_BEHAVIOR: cacheConsistentBehavior
    };
    //TODO: Maybe add extra env var for default TTL.

    return OpenStCache.getInstance(cacheConfigStrategy);
  }
};

module.exports = new InMemoryCacheProviderKlass();
