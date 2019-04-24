'use strict';
/**
 * OpenSTStorage Provider
 *
 * @module lib/providers/storage
 */
const OSTStorage = require('@ostdotcom/storage');

const rootPrefix = '../..',
  OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer,
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
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
   * Get instance of ost-storage.
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
      fullConfigStrategy = oThis.ic().configStrategy,
      configStrategyObject = new ConfigStrategyObject(fullConfigStrategy),
      //NOTE:  as Storage does not have any caching provide {}
      cacheConfig = {};

    console.log('fullConfigStrategy: ', fullConfigStrategy);
    console.log('configStrategyObject: ', configStrategyObject);
    console.log('dbType: ', dbType);
    switch (dbType) {
      case storageConstants.shared:
        if (!fullConfigStrategy.globalDynamodb) {
          throw `missing db config for ${dbType}`;
        }
        return Object.assign({}, { storage: fullConfigStrategy.globalDynamodb }, cacheConfig);
      case storageConstants.sharded:
        let dynamoConfig;
        if (configStrategyObject.originChainId == chainId) {
          dynamoConfig = fullConfigStrategy.originDynamodb;
        } else {
          dynamoConfig = fullConfigStrategy.dynamodb;
        }
        if (!dynamoConfig) {
          throw `missing db config for ${dbType} & chainId: ${chainId}`;
        }
        return Object.assign({}, { storage: dynamoConfig }, cacheConfig);
      default:
        throw `unsupported ${dbType}`;
    }
  }
}

InstanceComposer.registerAsObject(StorageProvider, coreConstants.icNameSpace, 'storageProvider', true);

module.exports = StorageProvider;
