'use strict';
/**
 * OpenSTStorage Provider
 *
 * @module lib/providers/storage
 */
const OSTStorage = require('@openstfoundation/openst-storage');

const rootPrefix = '../..',
  OSTBase = require("@openstfoundation/openst-base"),
  InstanceComposer = OSTBase.InstanceComposer,
  storageConstants = require(rootPrefix + '/lib/globalConstant/storage');

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

    return OSTStorage.getInstance(oThis.getStorageConfigStrategy(dbType, chainId));
  }

  /**
   * Get storage config strategy
   *
   * @param {String} dbType: shared or sharded
   * @param {Number} chainId: chain id
   */
  getStorageConfigStrategy(dbType, chainId) {
    const oThis = this,
      blockScannerConfigStrategy = oThis.ic().configStrategy,
      configFormatter = oThis.ic().configFormatter();

    switch (dbType) {
      case storageConstants.shared:
        if (!blockScannerConfigStrategy.storage) {
          throw `missing db config for ${dbType}`;
        }

        return Object.assign(
          {},
          configFormatter.formatStorageConfig(blockScannerConfigStrategy.storage),
          configFormatter.formatCacheConfig(blockScannerConfigStrategy.cache)
        );
      case storageConstants.sharded:
        let chainConfig = configFormatter.configFor(chainId);
        if (!chainConfig) {
          throw `missing db config for ${dbType} - ${chainId} pair`;
        }
        return Object.assign(
          {},
          configFormatter.formatStorageConfig(chainConfig.storage),
          configFormatter.formatCacheConfig(chainConfig.cache)
        );
      default:
        throw `unsupported ${dbType}`;
    }
  }
}

InstanceComposer.registerAsObject(StorageProvider, 'saas::SaasNamespace', 'storageProvider', true);

module.exports = StorageProvider;
