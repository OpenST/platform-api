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
        host: coreConstants.SAAS_SUBENV_MYSQL_HOST,
        user: coreConstants.SAAS_SUBENV_MYSQL_USER,
        password: coreConstants.SAAS_SUBENV_MYSQL_PASSWORD
      }
    },
    cluster2: {
      master: {
        host: coreConstants.KIT_SAAS_SUBENV_MYSQL_HOST,
        user: coreConstants.KIT_SAAS_SUBENV_MYSQL_USER,
        password: coreConstants.KIT_SAAS_SUBENV_MYSQL_PASSWORD
      }
    },
    cluster3: {
      master: {
        host: coreConstants.SAAS_BIG_SUBENV_MYSQL_HOST,
        user: coreConstants.SAAS_BIG_SUBENV_MYSQL_USER,
        password: coreConstants.SAAS_BIG_SUBENV_MYSQL_PASSWORD
      }
    },
    cluster4: {
      master: {
        host: coreConstants.CONFIG_SUBENV_MYSQL_HOST,
        user: coreConstants.CONFIG_SUBENV_MYSQL_USER,
        password: coreConstants.CONFIG_SUBENV_MYSQL_PASSWORD
      }
    },
    cluster5: {
      master: {
        host: coreConstants.KIT_SAAS_MYSQL_HOST,
        user: coreConstants.KIT_SAAS_MYSQL_USER,
        password: coreConstants.KIT_SAAS_MYSQL_PASSWORD
      }
    },
    cluster6: {
      master: {
        host: coreConstants.KIT_SAAS_BIG_SUBENV_MYSQL_HOST,
        user: coreConstants.KIT_SAAS_BIG_SUBENV_MYSQL_USER,
        password: coreConstants.KIT_SAAS_BIG_SUBENV_MYSQL_PASSWORD
      }
    },
    cluster7: {
      master: {
        host: coreConstants.OST_INFRA_MYSQL_HOST,
        user: coreConstants.OST_INFRA_MYSQL_USER,
        password: coreConstants.OST_INFRA_MYSQL_PASSWORD
      }
    }
  },
  databases: {}
};

// saas_subenv database
mysqlConfig['databases']['saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment] = ['cluster1'];

// kit_saas_subenv database
mysqlConfig['databases']['kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment] = ['cluster2'];

// saas_big_subenv database
mysqlConfig['databases']['saas_big_' + coreConstants.subEnvironment + '_' + coreConstants.environment] = ['cluster3'];

// siege database
mysqlConfig['databases']['siege_' + coreConstants.subEnvironment + '_' + coreConstants.environment] = ['cluster3'];

// config_subenv database
mysqlConfig['databases']['config_' + coreConstants.subEnvironment + '_' + coreConstants.environment] = ['cluster4'];

// kit_saas database
mysqlConfig['databases']['kit_saas_' + coreConstants.environment] = ['cluster5'];

// kit_saas_big database
mysqlConfig['databases']['kit_saas_big_' + coreConstants.subEnvironment + '_' + coreConstants.environment] = [
  'cluster6'
];

// ost_infra database
mysqlConfig['databases']['ost_infra'] = ['cluster7'];

module.exports = mysqlConfig;
