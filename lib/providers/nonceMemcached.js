'use strict';
/**
 * Nonce memcache OpenStCache Provider
 *
 * @module lib/providers/nonceMemcached
 */
const OSTBase = require('@ostdotcom/base'),
  OpenStCache = require('@ostdotcom/cache'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

/**
 * Class for client specific ost-cache provider.
 *
 * @class
 */
class NonceCacheProviderKlass {
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
        servers: configStrategy[configStrategyConstants.globalNonceMemcached].servers,
        defaultTtl: configStrategy[configStrategyConstants.globalNonceMemcached].defaultTtl,
        consistentBehavior: cacheConsistentBehavior
      }
    };

    return OpenStCache.getInstance(cacheConfigStrategy);
  }
}

InstanceComposer.registerAsObject(NonceCacheProviderKlass, coreConstants.icNameSpace, 'nonceCacheProvider', true);

module.exports = new NonceCacheProviderKlass();
