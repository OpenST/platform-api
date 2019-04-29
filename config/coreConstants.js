'use strict';

/**
 * Class for core constants
 *
 * @class
 */
class CoreConstants {
  /**
   * Constructor for core constants
   *
   * @constructor
   */
  constructor() {}

  get originChainKind() {
    return 'origin';
  }

  get auxChainKind() {
    return 'aux';
  }

  get originChainKindName() {
    return 'Origin';
  }

  get auxChainKindName() {
    return 'Auxiliary';
  }

  get SAAS_ONLY_SHARED_CACHE_ENGINE() {
    return process.env.SA_ONLY_SHARED_CACHE_ENGINE;
  }

  get SHARED_MEMCACHE_SERVERS() {
    return process.env.SA_SHARED_MEMCACHE_SERVERS.split(',');
  }

  get environment() {
    return process.env.SA_ENVIRONMENT;
  }

  get subEnvironment() {
    return process.env.SA_SUB_ENVIRONMENT;
  }

  get environmentShort() {
    return process.env.SA_ENVIRONMENT.substring(0, 2);
  }

  get subEnvironmentShort() {
    return process.env.SA_SUB_ENVIRONMENT.substring(0, 2);
  }

  get MYSQL_CONNECTION_POOL_SIZE() {
    return process.env.SA_MYSQL_CONNECTION_POOL_SIZE;
  }

  get SAAS_SUBENV_MYSQL_HOST() {
    return process.env.SA_SAAS_SUBENV_MYSQL_HOST;
  }

  get SAAS_SUBENV_MYSQL_USER() {
    return process.env.SA_SAAS_SUBENV_MYSQL_USER;
  }

  get SAAS_SUBENV_MYSQL_PASSWORD() {
    return process.env.SA_SAAS_SUBENV_MYSQL_PASSWORD;
  }

  get CONFIG_SUBENV_MYSQL_HOST() {
    return process.env.SA_CONFIG_SUBENV_MYSQL_HOST;
  }

  get CONFIG_SUBENV_MYSQL_USER() {
    return process.env.SA_CONFIG_SUBENV_MYSQL_USER;
  }

  get CONFIG_SUBENV_MYSQL_PASSWORD() {
    return process.env.SA_CONFIG_SUBENV_MYSQL_PASSWORD;
  }

  get SAAS_BIG_SUBENV_MYSQL_HOST() {
    return process.env.SA_SAAS_BIG_SUBENV_MYSQL_HOST;
  }

  get SAAS_BIG_SUBENV_MYSQL_USER() {
    return process.env.SA_SAAS_BIG_SUBENV_MYSQL_USER;
  }

  get SAAS_BIG_SUBENV_MYSQL_PASSWORD() {
    return process.env.SA_SAAS_BIG_SUBENV_MYSQL_PASSWORD;
  }

  get KIT_SAAS_SUBENV_MYSQL_HOST() {
    return process.env.SA_KIT_SAAS_SUBENV_MYSQL_HOST;
  }

  get KIT_SAAS_SUBENV_MYSQL_USER() {
    return process.env.SA_KIT_SAAS_SUBENV_MYSQL_USER;
  }

  get KIT_SAAS_SUBENV_MYSQL_PASSWORD() {
    return process.env.SA_KIT_SAAS_SUBENV_MYSQL_PASSWORD;
  }

  get KIT_SAAS_MYSQL_HOST() {
    return process.env.SA_KIT_SAAS_MYSQL_HOST;
  }

  get KIT_SAAS_MYSQL_USER() {
    return process.env.SA_KIT_SAAS_MYSQL_USER;
  }

  get KIT_SAAS_MYSQL_PASSWORD() {
    return process.env.SA_KIT_SAAS_MYSQL_PASSWORD;
  }

  get KIT_SAAS_BIG_SUBENV_MYSQL_HOST() {
    return process.env.SA_KIT_SAAS_BIG_SUBENV_MYSQL_HOST;
  }

  get KIT_SAAS_BIG_SUBENV_MYSQL_USER() {
    return process.env.SA_KIT_SAAS_BIG_SUBENV_MYSQL_USER;
  }

  get KIT_SAAS_BIG_SUBENV_MYSQL_PASSWORD() {
    return process.env.SA_KIT_SAAS_BIG_SUBENV_MYSQL_PASSWORD;
  }

  get OST_INFRA_MYSQL_HOST() {
    return process.env.SA_OST_INFRA_MYSQL_HOST;
  }

  get OST_INFRA_MYSQL_USER() {
    return process.env.SA_OST_INFRA_MYSQL_USER;
  }

  get OST_INFRA_MYSQL_PASSWORD() {
    return process.env.SA_OST_INFRA_MYSQL_PASSWORD;
  }

  get OST_INFRA_MYSQL_DB() {
    return process.env.SA_OST_INFRA_MYSQL_DB;
  }

  get OST_ANALYTICS_MYSQL_HOST() {
    return process.env.SA_OST_ANALYTICS_MYSQL_HOST;
  }

  get OST_ANALYTICS_MYSQL_USER() {
    return process.env.SA_OST_ANALYTICS_MYSQL_USER;
  }

  get OST_ANALYTICS_MYSQL_PASSWORD() {
    return process.env.SA_OST_ANALYTICS_MYSQL_PASSWORD;
  }

  get OST_ANALYTICS_MYSQL_DB() {
    return process.env.SA_OST_ANALYTICS_MYSQL_DB;
  }

  get KMS_AWS_ACCESS_KEY() {
    return process.env.SA_KMS_AWS_ACCESS_KEY;
  }

  get KMS_AWS_SECRET_KEY() {
    return process.env.SA_KMS_AWS_SECRET_KEY;
  }

  get KMS_AWS_REGION() {
    return process.env.SA_KMS_AWS_REGION;
  }

  get KMS_API_KEY_ARN() {
    return process.env.SA_API_KEY_KMS_ARN;
  }

  get KMS_API_KEY_ID() {
    return process.env.SA_API_KEY_KMS_ID;
  }

  get KMS_KNOWN_ADDR_KEY_ARN() {
    return process.env.SA_KNOWN_ADDRESS_KMS_ARN;
  }

  get KMS_KNOWN_ADDR_KEY_ID() {
    return process.env.SA_KNOWN_ADDRESS_KMS_ID;
  }

  get KMS_CONFIG_STRATEGY_KEY_ARN() {
    return process.env.SA_CONFIG_STRATEGY_KMS_ARN;
  }

  get KMS_CONFIG_STRATEGY_KEY_ID() {
    return process.env.SA_CONFIG_STRATEGY_KMS_ID;
  }

  // JWT details
  get INTERNAL_API_SECRET_KEY() {
    return process.env.SA_INTERNAL_API_SECRET_KEY;
  }

  // Cache data key
  get CACHE_SHA_KEY() {
    return process.env.SA_CACHE_DATA_SHA_KEY;
  }

  get DEBUG_ENABLED() {
    return process.env.OST_DEBUG_ENABLED;
  }

  get SHARED_MEMCACHE_KEY_PREFIX() {
    return 'sa_';
  }

  get SAAS_SHARED_MEMCACHE_KEY_PREFIX() {
    return 'sa_shared_';
  }

  get KIT_SHARED_MEMCACHE_KEY_PREFIX() {
    return 'kit_shared_';
  }

  get CONFIG_STRATEGY_SALT() {
    return 'config_strategy_salt';
  }

  get OST_WEB3_POOL_SIZE() {
    return process.env.OST_WEB3_POOL_SIZE;
  }

  get ENV_IDENTIFIER() {
    return process.env.DEVOPS_ENV_ID ? process.env.DEVOPS_ENV_ID : '';
  }

  get IP_ADDRESS() {
    return process.env.DEVOPS_IP_ADDRESS || '';
  }

  get APP_NAME() {
    return process.env.DEVOPS_APP_NAME || '';
  }

  get MIN_ORIGIN_GAS_PRICE() {
    return process.env.SA_MIN_ORIGIN_GAS_PRICE;
  }

  get MAX_ORIGIN_GAS_PRICE() {
    return process.env.SA_MAX_ORIGIN_GAS_PRICE;
  }

  get DEFAULT_ORIGIN_GAS_PRICE() {
    return process.env.SA_DEFAULT_ORIGIN_GAS_PRICE;
  }

  get BUFFER_ORIGIN_GAS_PRICE() {
    return process.env.SA_BUFFER_ORIGIN_GAS_PRICE;
  }

  get icNameSpace() {
    return 'saas::SaasNamespace';
  }

  get OST_ORIGIN_GAS_LIMIT() {
    return 8000000;
  }

  get OST_AUX_GAS_LIMIT() {
    return 8000000;
  }

  get OST_AUX_STPRIME_TOTAL_SUPPLY() {
    return '800000000';
  }

  get blockRetryCount() {
    return 10;
  }

  get STAKE_CURRENCY_TO_BT_CONVERSION_RATE_DECIMALS() {
    return '5';
  }

  get STAKE_CURRENCY_TO_BT_CONVERSION_RATE_MULTIPLIER() {
    return '100000';
  }

  get FLOWS_FOR_MINIMUM_BALANCE() {
    return 5;
  }

  get FLOWS_FOR_TRANSFER_BALANCE() {
    return 5;
  }

  get FLOWS_FOR_GRANTER_ECONOMY_SETUP() {
    return 10;
  }

  get FLOWS_FOR_CHAIN_OWNER_ECONOMY_SETUP() {
    return 10;
  }

  get TX_WORKER_COUNT() {
    return 5;
  }

  get MINIMUM_NO_OF_EXECUTE_TRANSACTION() {
    return 1000;
  }

  get TOTAL_NO_OF_EXECUTE_TRANSACTION() {
    return 10000;
  }

  get BUFFER_BLOCK_HEIGHT() {
    return 100;
  }

  get ORIGIN_GAS_BUFFER() {
    return 1;
  }

  get AUX_GAS_BUFFER() {
    return 1;
  }

  get FUND_MIF_WITH_OST_AMOUNT() {
    return 1000000;
  }

  get ETH_CONVERSION_DECIMALS() {
    return 18;
  }

  get USDC_CONVERSION_DECIMALS() {
    return 6;
  }
  /**
   * Batch delete retry count
   *
   * @return {Number}
   */
  get batchDeleteRetryCount() {
    return 10;
  }

  /**
   * S3 AWS config
   */
  get S3_AWS_ACCESS_KEY() {
    return process.env.SA_S3_AWS_ACCESS_KEY;
  }

  get S3_AWS_SECRET_KEY() {
    return process.env.SA_S3_AWS_SECRET_KEY;
  }

  get S3_AWS_REGION() {
    return process.env.SA_S3_AWS_REGION;
  }

  get S3_AWS_MASTER_FOLDER() {
    return process.env.SA_S3_AWS_MASTER_FOLDER;
  }

  get S3_ANALYTICS_BUCKET() {
    return process.env.SA_S3_ANALYTICS_BUCKET;
  }

  get S3_ANALYTICS_GRAPH_FOLDER() {
    const oThis = this;

    return oThis.S3_AWS_MASTER_FOLDER + '/' + process.env.SA_S3_ANALYTICS_GRAPH_FOLDER;
  }
}

module.exports = new CoreConstants();
