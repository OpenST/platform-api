'use strict';

const rootPrefix = '..',
  coreConstants = require(rootPrefix + '/config/coreConstants');

const mysqlConfig = {
  commonNodeConfig: {
    connectionLimit: coreConstants.MYSQL_CONNECTION_POOL_SIZE,
    charset: 'UTF8_UNICODE_CI',
    bigNumberStrings: true,
    supportBigNumbers: true,
    dateStrings: true,
    debug: false
  },
  commonClusterConfig: {
    canRetry: true,
    removeNodeErrorCount: 5,
    restoreNodeTimeout: 10000,
    defaultSelector: 'RR'
  },
  clusters: {
    cluster1: {
      master: {
        host: coreConstants.DEFAULT_MYSQL_HOST,
        user: coreConstants.DEFAULT_MYSQL_USER,
        password: coreConstants.DEFAULT_MYSQL_PASSWORD
      }
    },
    cluster2: {
      master: {
        host: coreConstants.CA_SHARED_MYSQL_HOST,
        user: coreConstants.CA_SHARED_MYSQL_USER,
        password: coreConstants.CA_SHARED_MYSQL_PASSWORD
      }
    },
    cluster3: {
      master: {
        host: coreConstants.CR_BIG_DB_MYSQL_HOST,
        user: coreConstants.CR_BIG_DB_MYSQL_USER,
        password: coreConstants.CR_BIG_DB_MYSQL_PASSWORD
      }
    },
    cluster4: {
      master: {
        host: coreConstants.CR_TRANSACTION_DB_MYSQL_HOST,
        user: coreConstants.CR_TRANSACTION_DB_MYSQL_USER,
        password: coreConstants.CR_TRANSACTION_DB_MYSQL_PASSWORD
      }
    }
  },
  databases: {}
};

mysqlConfig['databases']['saas_airdrop_' + coreConstants.subEnvironment + '_' + coreConstants.environment] = [
  'cluster1'
];

mysqlConfig['databases']['saas_big_' + coreConstants.subEnvironment + '_' + coreConstants.environment] = ['cluster1'];

mysqlConfig['databases']['saas_client_economy_' + coreConstants.subEnvironment + '_' + coreConstants.environment] = [
  'cluster3'
];

mysqlConfig['databases']['saas_transaction_' + coreConstants.subEnvironment + '_' + coreConstants.environment] = [
  'cluster4'
];

mysqlConfig['databases']['kit_saas_shared_' + coreConstants.subEnvironment + '_' + coreConstants.environment] = [
  'cluster2'
];

mysqlConfig['databases']['config_' + coreConstants.subEnvironment + '_' + coreConstants.environment] = [
  'cluster3'
];

module.exports = mysqlConfig;
