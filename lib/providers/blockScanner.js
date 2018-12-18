'use strict';

/**
 * OpenSTStorage Provider
 *
 * @module lib/providers/storage
 */
const OSTStorage = require('@openstfoundation/openst-storage');

const rootPrefix = '../..',
  OSTBlockScanner = require("@openstfoundation/openst-block-scanner"),
  OSTBase = require("@openstfoundation/openst-base"),
  InstanceComposer = OSTBase.InstanceComposer,
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/formatter/config');

/**
 * Class for storage provider
 *
 * @class
 */
class StorageProvider {
  /**
   * Constructor for storage provider
   *
   * @param {Object} configStrategy
   * @param instanceComposer
   */
  constructor(configStrategy, instanceComposer) {}

  /**
   * Get instance of openst-storage.
   *
   * @returns {Object}
   */
  getInstance(dbType, chainId) {
    const oThis = this;

    return OSTStorage.getInstance(oThis.getBlockScannerConfigStrategy(dbType, chainId));
  }

  /**
   * Get storage config strategy
   *
   * @param {String} dbType: shared or sharded
   * @param {Number} chainId: chain id
   */
  getBlockScannerConfigStrategy(dbType, chainId) {
    const oThis = this,
      blockScannerConfigStrategy = oThis.ic().configStrategy,
      configFormatter = oThis.ic().configFormatter(),
      finalConfig = {};

    Object.assign(finalConfig, configFormatter.formatCacheConfig(configStrategyConstants.globalMemcached));
    Object.assign(finalConfig, configFormatter.formatStorageConfig(configStrategyConstants.globalRabbitmq));

    return finalConfig;
  }
}

InstanceComposer.registerAsObject(StorageProvider, 'saas::SaasNamespace', 'storageProvider', true);

module.exports = StorageProvider;
