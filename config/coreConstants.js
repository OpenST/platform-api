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

  get SAAS_ONLY_SHARED_CACHE_ENGINE() {
    return process.env.SA_ONLY_SHARED_CACHE_ENGINE;
  }

  get SHARED_MEMCACHE_SERVERS() {
    return process.env.OST_SHARED_MEMCACHE_SERVERS.split(',');
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

  get AWS_ACCESS_KEY() {
    return process.env.SA_AWS_ACCESS_KEY;
  }

  get AWS_SECRET_KEY() {
    return process.env.SA_AWS_SECRET_KEY;
  }

  get AWS_REGION() {
    return process.env.SA_AWS_REGION;
  }

  get KMS_API_KEY_ARN() {
    return process.env.SA_API_KEY_KMS_ARN;
  }

  get KMS_API_KEY_ID() {
    return process.env.SA_API_KEY_KMS_ID;
  }

  get KMS_MANAGED_ADDR_KEY_ARN() {
    return process.env.SA_MANAGED_ADDRESS_KMS_ARN;
  }

  get KMS_MANAGED_ADDR_KEY_ID() {
    return process.env.SA_MANAGED_ADDRESS_KMS_ID;
  }

  // JWT details
  get SAAS_API_SECRET_KEY() {
    return process.env.CA_SAAS_API_SECRET_KEY;
  }

  // SHA256 details
  get GENERIC_SHA_KEY() {
    return process.env.CA_GENERIC_SHA_KEY;
  }

  // Cache data key
  get CACHE_SHA_KEY() {
    return process.env.CR_CACHE_DATA_SHA_KEY;
  }

  get DEBUG_ENABLED() {
    return process.env.OST_DEBUG_ENABLED;
  }

  // Price oracle details
  get ACCEPTED_PRICE_FLUCTUATION_FOR_PAYMENT() {
    let accepted_margin = {};
    try {
      accepted_margin = JSON.parse(process.env.SA_ACCEPTED_PRICE_FLUCTUATION_FOR_PAYMENT);
    } catch (err) {}

    return accepted_margin;
  }

  get SHARED_MEMCACHE_KEY_PREFIX() {
    return 'ca_sa_shared_';
  }

  get CONFIG_STRATEGY_SALT() {
    return 'config_strategy_salt';
  }

  get OST_WEB3_POOL_SIZE() {
    return process.env.OST_WEB3_POOL_SIZE;
  }

  get ENV_IDENTIFIER() {
    return process.env.ENV_IDENTIFIER ? process.env.ENV_IDENTIFIER : '';
  }

  get APP_SHARED_DIRECTORY() {
    return process.env.APP_SHARED_DIRECTORY;
  }

  get MIN_VALUE_GAS_PRICE() {
    return process.env.MIN_VALUE_GAS_PRICE;
  }

  get MAX_VALUE_GAS_PRICE() {
    return process.env.MAX_VALUE_GAS_PRICE;
  }

  get DEFAULT_VALUE_GAS_PRICE() {
    return process.env.DEFAULT_VALUE_GAS_PRICE;
  }

  get BUFFER_VALUE_GAS_PRICE() {
    return process.env.BUFFER_VALUE_GAS_PRICE;
  }

  get icNameSpace() {
    return 'saas::SaasNamespace';
  }

  get OST_ORIGIN_GAS_LIMIT() {
    return 4700000;
  }

  get OST_AUX_GAS_LIMIT() {
    return 9000000;
  }

  get OST_AUX_STPRIME_TOTAL_SUPPLY() {
    return '800000000';
  }

  get blockRetryCount() {
    return 10;
  }

  get CONVERSION_RATE_DECIMALS() {
    return '5';
  }

  get CONVERSION_RATE_MULTIPLIER() {
    return '100000';
  }

  /**
   * Batch delete retry count
   *
   * @return {Number}
   */
  get batchDeleteRetryCount() {
    return 10;
  }
}

module.exports = new CoreConstants();
