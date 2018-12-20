'use strict';

/**
 * In-memory cache instance provider.
 *
 * @module /lib/providers/inMemoryCache
 */

const rootPrefix = '../..',
  OpenStCache = require('@openstfoundation/openst-cache');

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
   * @return {Object}
   */
  getInstance: function(cacheConsistentBehavior) {
    const cacheConfigStrategy = {
      cache: {
        engine: 'none',
        namespace: 'saasApi_',
        defaultTtl: 36000,
        consistentBehavior: 1
      }
    };

    return OpenStCache.getInstance(cacheConfigStrategy);
  }
};

module.exports = new InMemoryCacheProviderKlass();
