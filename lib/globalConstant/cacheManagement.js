'use strict';
/**
 * Cache management constants.
 *
 * @module lib/globalConstant/cacheManagement
 */

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants');

let keyPrefixes;

/**
 * Class for cache management constants.
 *
 * @class
 */
class CacheManagement {
  /**
   * Constructor for cache management constants.
   *
   * @constructor
   */
  constructor() {}

  get memcached() {
    return 'memcached';
  }

  get nonceMemcached() {
    return 'nonceMemcached';
  }

  get sharedMemcached() {
    return 'shared_memcached';
  }

  get inMemory() {
    return 'in_memory';
  }

  get redis() {
    return 'redis';
  }

  get kitLevel() {
    return 'kit';
  }

  get saasLevel() {
    return 'saas';
  }

  get kitSaasLevel() {
    return 'kitSaas';
  }

  get kitSubEnvLevel() {
    return 'kitSubEnv';
  }

  get saasSubEnvLevel() {
    return 'saasSubEnv';
  }

  get kitSaasSubEnvLevel() {
    return 'kitSaasSubEnv';
  }

  get keyPrefixes() {
    const oThis = this;
    if (keyPrefixes) {
      return keyPrefixes;
    }
    keyPrefixes = {
      [oThis.kitLevel]: `${coreConstants.environmentShort}_KIT`,
      [oThis.saasLevel]: `${coreConstants.environmentShort}_SAAS`,
      [oThis.kitSaasLevel]: `${coreConstants.environmentShort}_KIT_SAAS`,
      [oThis.kitSubEnvLevel]: `${coreConstants.environmentShort}_${coreConstants.subEnvironmentShort}_KIT`,
      [oThis.saasSubEnvLevel]: `${coreConstants.environmentShort}_${coreConstants.subEnvironmentShort}_SAAS`,
      [oThis.kitSaasSubEnvLevel]: `${coreConstants.environmentShort}_${coreConstants.subEnvironmentShort}_KIT_SAAS`
    };
    return keyPrefixes;
  }

  getSaasPrefixForLevel(level) {
    const oThis = this;
    return `${oThis.saasPrefix}_${oThis.getPrefixForLevel(level)}`;
  }

  getKitPrefixForLevel(level) {
    const oThis = this;
    return `${oThis.kitPrefix}_${oThis.getPrefixForLevel(level)}`;
  }

  getPrefixForLevel(level) {
    const oThis = this;
    let prefix = oThis.keyPrefixes[level];
    if (!prefix) {
      throw `missing cacheKeyPrefix for ${level}`;
    }
    return `${prefix}_`;
  }

  get kitPrefix() {
    return 'K';
  }

  get saasPrefix() {
    return 'S';
  }
}

module.exports = new CacheManagement();
