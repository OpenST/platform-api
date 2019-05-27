/**
 * Module for config strategy constants.
 *
 * @module lib/globalConstant/configStrategy
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

const configStrategy = {
  globalRabbitmq: 'globalRabbitmq',

  rabbitmq: 'rabbitmq',

  webhooksPreProcessorRabbitmq: 'webhooksPreProcessorRabbitmq',

  webhooksProcessorRabbitmq: 'webhooksProcessorRabbitmq',

  globalDynamodb: 'globalDynamodb',

  globalMemcached: 'globalMemcached',

  globalNonceMemcached: 'globalNonceMemcached',

  inMemoryCache: 'inMemoryCache',

  constants: 'constants',

  originGeth: 'originGeth',

  originMemcached: 'originMemcached',

  originDynamodb: 'originDynamodb',

  originConstants: 'originConstants',

  dynamodb: 'dynamodb',

  memcached: 'memcached',

  auxGeth: 'auxGeth',

  auxConstants: 'auxConstants',

  elasticSearch: 'elasticSearch',

  originRabbitmq: 'originRabbitmq',

  activeStatus: 'active',

  inActiveStatus: 'inactive',

  gethChainClient: 'geth',

  parityChainClient: 'parity',

  gethReadOnly: 'readOnly',

  gethReadWrite: 'readWrite',

  finalizeAfterBlocks: 'finalizeAfterBlocks',

  globalMandatoryKind: 'globalKind',

  auxMandatoryKind: 'auxKind'
};

const kinds = {
  '1': configStrategy.globalRabbitmq,
  '2': configStrategy.globalDynamodb,
  '3': configStrategy.globalMemcached,
  '4': configStrategy.globalNonceMemcached,
  '5': configStrategy.inMemoryCache,
  '6': configStrategy.constants,
  '7': configStrategy.originGeth,
  '8': configStrategy.originConstants,
  '9': configStrategy.originMemcached,
  '10': configStrategy.originDynamodb,
  '11': configStrategy.rabbitmq,
  '12': configStrategy.dynamodb,
  '13': configStrategy.memcached,
  '15': configStrategy.auxGeth,
  '16': configStrategy.auxConstants,
  '17': configStrategy.elasticSearch,
  '18': configStrategy.originRabbitmq,
  '19': configStrategy.webhooksPreProcessorRabbitmq,
  '20': configStrategy.webhooksProcessorRabbitmq
};

const statuses = {
  '1': configStrategy.activeStatus,
  '2': configStrategy.inActiveStatus
};

const mandatoryKinds = {
  [configStrategy.globalMandatoryKind]: [
    configStrategy.globalRabbitmq,
    configStrategy.globalDynamodb,
    configStrategy.globalNonceMemcached,
    configStrategy.originGeth,
    configStrategy.originDynamodb
  ],
  [configStrategy.auxMandatoryKind]: [configStrategy.auxGeth, configStrategy.dynamodb]
};

configStrategy.kindsWithoutChainIdMap = {
  [configStrategy.globalRabbitmq]: 1,
  [configStrategy.globalDynamodb]: 1,
  [configStrategy.globalMemcached]: 1,
  [configStrategy.globalNonceMemcached]: 1,
  [configStrategy.inMemoryCache]: 1,
  [configStrategy.originGeth]: 1,
  [configStrategy.originConstants]: 1,
  [configStrategy.constants]: 1,
  [configStrategy.originMemcached]: 1,
  [configStrategy.originDynamodb]: 1,
  [configStrategy.originRabbitmq]: 1
};

configStrategy.kinds = kinds;

configStrategy.invertedKinds = util.invert(kinds);

configStrategy.statuses = statuses;

configStrategy.invertedStatuses = util.invert(statuses);

configStrategy.mandatoryKinds = mandatoryKinds;

/**
 * Class for config strategy constants.
 *
 * @class ConfigStrategy
 */
class ConfigStrategy {
  get configStrategy() {
    return configStrategy;
  }
}

module.exports = new ConfigStrategy().configStrategy;
