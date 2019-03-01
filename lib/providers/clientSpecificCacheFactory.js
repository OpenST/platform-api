'use strict';
/**
 * Client specific OpenStCache Provider
 *
 * @module lib/providers/clientSpecificCacheFactory
 */
const OSTBase = require('@ostdotcom/base'),
  OpenStCache = require('@ostdotcom/cache'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

/**
 * Class for client specific ost-cache provider.
 *
 * @class
 */
class CacheProviderKlass {
  /**
   * Constructor for client specific ost-cache provider.
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
   * @param {String} cacheType
   * @param {Number} cacheConsistentBehavior
   *
   * @returns {Object}
   */
  getInstance(cacheType, cacheConsistentBehavior) {
    const oThis = this,
      configStrategy = oThis.ic().configStrategy;

    let cacheConfigStrategy = null;

    if (cacheManagementConst.memcached === cacheType) {
      cacheConfigStrategy = {
        cache: {
          engine: cacheManagementConst.memcached,
          servers: configStrategy.memcached.servers,
          defaultTtl: configStrategy.memcached.defaultTtl,
          consistentBehavior: cacheConsistentBehavior
        }
      };
    } else {
      throw `client_specific_cache_factory: Invalid cache type: ${cacheType}`;
    }
    return OpenStCache.getInstance(cacheConfigStrategy);
  }
}

InstanceComposer.registerAsObject(CacheProviderKlass, coreConstants.icNameSpace, 'ClientSpecificCacheProvider', true);

module.exports = new CacheProviderKlass();
