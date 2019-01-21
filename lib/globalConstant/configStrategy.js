'use strict';

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

const configStrategy = {
  globalRabbitmq: 'globalRabbitmq',

  globalDynamodb: 'globalDynamodb',

  globalMemcached: 'globalMemcached',

  globalNonceMemcached: 'globalNonceMemcached',

  inMemoryCache: 'inMemoryCache',

  constants: 'constants',

  originGeth: 'originGeth',

  originMemcached: 'originMemcached',

  originDynamo: 'originDynamo',

  originConstants: 'originConstants',

  rabbitmq: 'rabbitmq',

  dynamodb: 'dynamodb',

  memcached: 'memcached',

  nonceMemcached: 'nonceMemcached',

  auxGeth: 'auxGeth',

  auxConstants: 'auxConstants',

  elasticSearch: 'elasticSearch',

  activeStatus: 'active',

  inActiveStatus: 'inactive',

  gethChainClient: 'geth',

  parityChainClient: 'parity',

  gethReadOnly: 'readOnly',

  gethReadWrite: 'readWrite',

  finalizeAfterBlocks: 'finalizeAfterBlocks'
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
  '10': configStrategy.originDynamo,
  '11': configStrategy.rabbitmq,
  '12': configStrategy.dynamodb,
  '13': configStrategy.memcached,
  '14': configStrategy.nonceMemcached,
  '15': configStrategy.auxGeth,
  '16': configStrategy.auxConstants,
  '17': configStrategy.elasticSearch
};

const statuses = {
  '1': configStrategy.activeStatus,
  '2': configStrategy.inActiveStatus
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
  [configStrategy.originDynamo]: 1
};

configStrategy.kinds = kinds;

configStrategy.invertedKinds = util.invert(kinds);

configStrategy.statuses = statuses;

configStrategy.invertedStatuses = util.invert(statuses);

/**
 * Class for config strategy constants.
 *
 * @class
 */
class ConfigStrategy {
  /**
   * Constructor for config strategy constants.
   *
   * @constructor
   */
  constructor() {}

  get configStrategy() {
    return configStrategy;
  }
}

module.exports = new ConfigStrategy().configStrategy;
