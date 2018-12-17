'use strict';

/**
 * In-memory cache instance provider.
 *
 * @module /lib/providers/inMemoryCache
 */

const rootPrefix = '../..',
  OpenStCache = require('@openstfoundation/openst-cache'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

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
      "cache": {
        "engine": cacheManagementConst.memcached,
        "servers": [
          "127.0.0.1:11211"
        ],
        "defaultTtl": 36000,
        "consistentBehavior": 1
      }
    };
    //TODO: Maybe add extra env var for default TTL.

    return OpenStCache.getInstance(cacheConfigStrategy);
  }
};

module.exports = new InMemoryCacheProviderKlass();
