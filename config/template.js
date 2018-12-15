'use strict';

const rootPrefix = '..',
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

let configTemplate = {'entitiesMap': {}, 'rootLevelEntities': {}};

configTemplate['rootLevelEntities'][configStrategyConstants.memcached] = "memcachedEntity";
configTemplate['rootLevelEntities'][configStrategyConstants.dynamodb] = "dynamodbEntity";

configTemplate['entitiesMap'] = {

  memcachedEntity : {
    entityType: 'object',
    entitiesPresent: {
      engine: "engineEntity",
      servers: "serversEntity",
      defaultTtl: "defaultTtlEntity",
      consistentBehavior: "consistentBehaviorEntity"
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

  dynamodbEntity: {
    entityType: 'object',
    entitiesPresent: {
      endpoint: 'endpointEntity',
      region: 'regionEntity',
      apiKey: 'apiKeyEntity',
      apiSecret: 'apiSecretEntity',
      apiVersion: 'apiVersionEntity',
      enableSsl: 'enableSslEntity',
      tablePrefix: 'tablePrefixEntity',
      enableLogging: 'enableLoggingEntity',
      enableAutoscaling: 'enableAutoscalingEntity',
      maxRetryCount: 'maxRetryCountEntity',
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
  tablePrefixEntity: {
    entityType: 'string'
  },
  enableLoggingEntity: {
    entityType: 'string'
  },
  enableAutoscalingEntity: {
    entityType: 'string'
  },
  maxRetryCountEntity: {
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
  }

};


module.exports = configTemplate;
