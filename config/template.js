'use strict';

const rootPrefix = '..',
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

let configTemplate = { entitiesMap: {}, rootLevelEntities: {} };

configTemplate['rootLevelEntities'][configStrategyConstants.memcached] = 'memcachedEntity';
configTemplate['rootLevelEntities'][configStrategyConstants.originMemcached] = 'memcachedEntity';
configTemplate['rootLevelEntities'][configStrategyConstants.globalMemcached] = 'memcachedEntity';
configTemplate['rootLevelEntities'][configStrategyConstants.nonceMemcached] = 'memcachedEntity';
configTemplate['rootLevelEntities'][configStrategyConstants.globalNonceMemcached] = 'memcachedEntity';
configTemplate['rootLevelEntities'][configStrategyConstants.inMemoryCache] = 'inMemoryCacheEntity';
configTemplate['rootLevelEntities'][configStrategyConstants.dynamodb] = 'dynamodbEntity';
configTemplate['rootLevelEntities'][configStrategyConstants.originDynamodb] = 'dynamodbEntity';
configTemplate['rootLevelEntities'][configStrategyConstants.globalDynamodb] = 'dynamodbEntity';
configTemplate['rootLevelEntities'][configStrategyConstants.originGeth] = 'originGethEntity';
configTemplate['rootLevelEntities'][configStrategyConstants.auxGeth] = 'auxGethEntity';
configTemplate['rootLevelEntities'][configStrategyConstants.originConstants] = 'originConstantsEntity';
configTemplate['rootLevelEntities'][configStrategyConstants.auxConstants] = 'auxConstantsEntity';
configTemplate['rootLevelEntities'][configStrategyConstants.elasticSearch] = 'elasticSearchEntity';
configTemplate['rootLevelEntities'][configStrategyConstants.rabbitmq] = 'rabbitmqEntity';
configTemplate['rootLevelEntities'][configStrategyConstants.globalRabbitmq] = 'globalRabbitmqEntity';
configTemplate['rootLevelEntities'][configStrategyConstants.constants] = 'constantsEntity';

configTemplate['entitiesMap'] = {
  memcachedEntity: {
    entityType: 'object',
    entitiesPresent: {
      engine: 'engineEntity',
      servers: 'serversEntity',
      defaultTtl: 'defaultTtlEntity',
      consistentBehavior: 'consistentBehaviorEntity'
    }
  },
  engineEntity: {
    entityType: 'string'
  },
  serversEntity: {
    entityType: 'array',
    entitiesPresent: 'serverEntity' //For an array entity this array will contain entity types which that array will hold
  },
  serverEntity: {
    entityType: 'string'
  },
  defaultTtlEntity: {
    entityType: 'number'
  },
  consistentBehaviorEntity: {
    entityType: 'string'
  },

  inMemoryCacheEntity: {
    entityType: 'object',
    entitiesPresent: {
      engine: 'engineEntity',
      defaultTtl: 'defaultTtlEntity',
      namespace: 'namespaceEntity',
      consistentBehavior: 'consistentBehaviorEntity'
    }
  },
  namespaceEntity: {
    entityType: 'string'
  },

  dynamodbEntity: {
    entityType: 'object',
    entitiesPresent: {
      endpoint: 'endpointEntity',
      region: 'regionEntity',
      apiKey: 'apiKeyEntity',
      apiSecret: 'apiSecretEntity',
      apiVersion: 'apiVersionEntity',
      enableSsl: 'enableSslEntity',
      enableLogging: 'enableLoggingEntity',
      enableAutoscaling: 'enableAutoscalingEntity',
      autoScaling: 'autoScalingEntity'
    }
  },
  endpointEntity: {
    entityType: 'string'
  },
  regionEntity: {
    entityType: 'string'
  },
  apiKeyEntity: {
    entityType: 'string'
  },
  apiSecretEntity: {
    entityType: 'string'
  },
  apiVersionEntity: {
    entityType: 'string'
  },
  enableSslEntity: {
    entityType: 'string'
  },
  enableLoggingEntity: {
    entityType: 'string'
  },
  enableAutoscalingEntity: {
    entityType: 'string'
  },
  autoScalingEntity: {
    entityType: 'object',
    entitiesPresent: {
      endpoint: 'endpointEntity',
      region: 'regionEntity',
      apiKey: 'apiKeyEntity',
      apiSecret: 'apiSecretEntity',
      apiVersion: 'apiVersionEntity',
      enableSsl: 'enableSslEntity'
    }
  },

  originGethEntity: {
    entityType: 'object',
    entitiesPresent: {
      readOnly: 'gethProvidersEntity',
      readWrite: 'gethProvidersEntity',
      chainId: 'chainIdEntity',
      client: 'gethClientEntity'
    }
  },
  rpcProviderEntity: {
    entityType: 'string'
  },
  rpcProvidersEntity: {
    entityType: 'array',
    entitiesPresent: 'rpcProviderEntity'
  },
  wsProviderEntity: {
    entityType: 'string'
  },
  wsProvidersEntity: {
    entityType: 'array',
    entitiesPresent: 'wsProviderEntity'
  },
  chainIdEntity: {
    entityType: 'number'
  },
  gethClientEntity: {
    entityType: 'string'
  },
  addressEntity: {
    entityType: 'string'
  },

  originConstantsEntity: {
    entityType: 'object',
    entitiesPresent: {
      placeHolder1: 'placeHolderEntity',
      placeHolder2: 'placeHolderEntity'
    }
  },
  placeHolderEntity: {
    entityType: 'string'
  },

  auxGethEntity: {
    entityType: 'object',
    entitiesPresent: {
      readOnly: 'gethProvidersEntity',
      readWrite: 'gethProvidersEntity',
      chainId: 'chainIdEntity',
      client: 'gethClientEntity'
    }
  },
  gethProvidersEntity: {
    entityType: 'object',
    entitiesPresent: {
      rpcProvider: 'rpcProviderEntity',
      rpcProviders: 'rpcProvidersEntity',
      wsProvider: 'wsProviderEntity',
      wsProviders: 'wsProvidersEntity'
    }
  },

  auxConstantsEntity: {
    entityType: 'object',
    entitiesPresent: {
      placeHolder3: 'placeHolderEntity',
      placeHolder4: 'placeHolderEntity'
    }
  },

  elasticSearchEntity: {
    entityType: 'object',
    entitiesPresent: {
      host: 'hostEntity',
      accessKey: 'accessKeyEntity',
      region: 'regionEntity',
      secretKey: 'secretKeyEntity'
    }
  },
  hostEntity: {
    entityType: 'string'
  },
  accessKeyEntity: {
    entityType: 'string'
  },
  secretKeyEntity: {
    entityType: 'string'
  },

  globalRabbitmqEntity: {
    entityType: 'object',
    entitiesPresent: {
      username: 'usernameEntity',
      password: 'passwordEntity',
      host: 'hostEntity',
      port: 'portEntity',
      heartbeats: 'heartbeatsEntity',
      clusterNodes: 'clusterNodesEntity'
    }
  },
  rabbitmqEntity: {
    entityType: 'object',
    entitiesPresent: {
      username: 'usernameEntity',
      password: 'passwordEntity',
      host: 'hostEntity',
      port: 'portEntity',
      heartbeats: 'heartbeatsEntity',
      clusterNodes: 'clusterNodesEntity'
    }
  },
  usernameEntity: {
    entityType: 'string'
  },
  passwordEntity: {
    entityType: 'string'
  },
  portEntity: {
    entityType: 'string'
  },
  heartbeatsEntity: {
    entityType: 'string'
  },
  clusterNodesEntity: {
    entityType: 'array',
    entitiesPresent: 'clusterNodeEntity'
  },
  clusterNodeEntity: {
    entityType: 'string'
  },

  constantsEntity: {
    entityType: 'object',
    entitiesPresent: {
      originDdbTablePrefix: 'originDdbTablePrefixEntity',
      auxDdbTablePrefix: 'auxDdbTablePrefixEntity',
      subEnvDdbTablePrefix: 'subEnvDdbTablePrefixEntity',
      originChainId: 'chainIdEntity'
    }
  },

  originDdbTablePrefixEntity: {
    entityType: 'string',
    valueCheckNeeded: 1
  },
  auxDdbTablePrefixEntity: {
    entityType: 'string',
    valueCheckNeeded: 1
  },
  subEnvDdbTablePrefixEntity: {
    entityType: 'string',
    valueCheckNeeded: 1
  }
};

module.exports = configTemplate;
