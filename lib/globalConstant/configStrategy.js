'use strict';

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

const configStrategy = {
  dynamodb: 'dynamodb',

  memcached: 'memcached',

  nonceMemcached: 'nonceMemcached',

  inMemoryCache: 'inMemoryCache',

  originGeth: 'originGeth',

  auxGeth: 'auxGeth',

  elasticSearch: 'elasticSearch',

  rabbitmq: 'rabbitmq',

  originConstants: 'originConstants',

  auxConstants: 'auxConstants',

  constants: 'constants',

  globalRabbitmq: 'globalRabbitmq',

  globalDynamo: 'globalDynamo',

  globalMemcached: 'globalMemcached',

  globalNonceMemcached: 'globalNonceMemcached',

  activeStatus: 'active',

  inActiveStatus: 'inactive',

  gethChainType: 'geth',

  parityChainType: 'parity'
};

const kinds = {
  '1': configStrategy.globalRabbitmq,
  '2': configStrategy.globalDynamo,
  '3': configStrategy.globalMemcached,
  '4': configStrategy.globalNonceMemcached,
  '5': configStrategy.inMemoryCache,
  '6': configStrategy.originGeth,
  '7': configStrategy.originConstants,
  '8': configStrategy.constants,
  '9': configStrategy.dynamodb,
  '10': configStrategy.memcached,
  '11': configStrategy.auxGeth,
  '12': configStrategy.auxConstants,
  '13': configStrategy.elasticSearch,
  '14': configStrategy.rabbitmq,
  '15': configStrategy.nonceMemcached
};

const statuses = {
  '1': configStrategy.activeStatus,
  '2': configStrategy.inActiveStatus
};

configStrategy.kindsWithoutChainIdMap = {
  [configStrategy.globalRabbitmq]: 1,
  [configStrategy.globalDynamo]: 1,
  [configStrategy.globalMemcached]: 1,
  [configStrategy.globalNonceMemcached]: 1,
  [configStrategy.inMemoryCache]: 1,
  [configStrategy.originGeth]: 1,
  [configStrategy.originConstants]: 1,
  [configStrategy.constants]: 1
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
