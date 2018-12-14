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

  activeStatus: 'active',

  inActiveStatus: 'inactive',

  gethChainType: 'geth',

  parityChainType: 'parity'
};

const kinds = {
  '1': configStrategy.dynamodb,
  '2': configStrategy.memcached,
  '3': configStrategy.nonceMemcached,
  '4': configStrategy.inMemoryCache,
  '5': configStrategy.originGeth,
  '6': configStrategy.auxGeth,
  '7': configStrategy.elasticSearch,
  '8': configStrategy.rabbitmq,
  '9': configStrategy.originConstants,
  '10': configStrategy.auxConstants,
  '11': configStrategy.constants,
};





const statuses = {
  '1': configStrategy.activeStatus,
  '2': configStrategy.inActiveStatus
};

const whiteListedKeys = {};

whiteListedKeys[configStrategy.auxGeth] = ['read_only', 'read_write'];

const kindsWithoutGroupId = ['inMemoryCache', 'originGeth', 'originConstants', 'constants'];

configStrategy.kinds = kinds;

configStrategy.invertedKinds = util.invert(kinds);

const invertedStatuses = util.invert(statuses);

configStrategy.kindsWithoutGroupId = kindsWithoutGroupId;

configStrategy.statuses = statuses;

configStrategy.invertedStatuses = invertedStatuses;

configStrategy.whiteListedKeys = whiteListedKeys;

module.exports = configStrategy;
