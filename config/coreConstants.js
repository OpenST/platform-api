'use strict';

class CoreConstant {

  constructor() {}

  get SAAS_ONLY_SHARED_CACHE_ENGINE() {
    return process.env.CR_ONLY_SHARED_CACHE_ENGINE;
  }

  get SHARED_MEMCACHE_SERVERS() {
    return (process.env.OST_SHARED_MEMCACHE_SERVERS).split(',');
  }

  get ENVIRONMENT() {
    return process.env.CR_ENVIRONMENT;
  }

  get SUB_ENVIRONMENT() {
    return process.env.CR_SUB_ENVIRONMENT;
  }

  get ENVIRONMENT_SHORT() {
    return process.env.CR_ENVIRONMENT.substring(0, 2);
  }

  get SUB_ENVIRONMENT_SHORT() {
    return process.env.CR_SUB_ENVIRONMENT.substring(0, 2);
  }

  get MYSQL_CONNECTION_POOL_SIZE() {
    return process.env.CR_MYSQL_CONNECTION_POOL_SIZE;
  }

  get DEFAULT_MYSQL_HOST() {
    return process.env.CR_DEFAULT_MYSQL_HOST;
  }

  get DEFAULT_MYSQL_USER() {
    return process.env.CR_DEFAULT_MYSQL_USER;
  }

  get DEFAULT_MYSQL_PASSWORD() {
    return process.env.CR_DEFAULT_MYSQL_PASSWORD;
  }

  get CR_ECONOMY_DB_MYSQL_HOST() {
    return process.env.CR_ECONOMY_DB_MYSQL_HOST;
  }

  get CR_ECONOMY_DB_MYSQL_USER() {
    return process.env.CR_ECONOMY_DB_MYSQL_USER;
  }

  get CR_ECONOMY_DB_MYSQL_PASSWORD() {
    return process.env.CR_ECONOMY_DB_MYSQL_PASSWORD;
  }

  get CR_TRANSACTION_DB_MYSQL_HOST() {
    return process.env.CR_TRANSACTION_DB_MYSQL_HOST;
  }

  get CR_TRANSACTION_DB_MYSQL_USER() {
    return process.env.CR_TRANSACTION_DB_MYSQL_USER;
  }

  get CR_TRANSACTION_DB_MYSQL_PASSWORD() {
    return process.env.CR_TRANSACTION_DB_MYSQL_PASSWORD;
  }

  get CA_SHARED_MYSQL_HOST() {
    return process.env.CR_CA_SHARED_MYSQL_HOST;
  }

  get CA_SHARED_MYSQL_USER() {
    return process.env.CR_CA_SHARED_MYSQL_USER;
  }

  get CA_SHARED_MYSQL_PASSWORD() {
    return process.env.CR_CA_SHARED_MYSQL_PASSWORD;
  }

  get AWS_ACCESS_KEY() {
    return process.env.CR_AWS_ACCESS_KEY;
  }

  get AWS_SECRET_KEY() {
    return process.env.CR_AWS_SECRET_KEY;
  }

  get AWS_REGION() {
    return process.env.CR_AWS_REGION;
  }

  get KMS_API_KEY_ARN() {
    return process.env.CR_API_KEY_KMS_ARN;
  }

  get KMS_API_KEY_ID() {
    return process.env.CR_API_KEY_KMS_ID;
  }

  get KMS_MANAGED_ADDR_KEY_ARN() {
    return process.env.CR_MANAGED_ADDRESS_KMS_ARN;
  }

  get KMS_MANAGED_ADDR_KEY_ID() {
    return process.env.CR_MANAGED_ADDRESS_KMS_ID;
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
      accepted_margin = JSON.parse(process.env.CR_ACCEPTED_PRICE_FLUCTUATION_FOR_PAYMENT);
    } catch (err) {}

    return accepted_margin;
  }

  get SHARED_MEMCACHE_KEY_PREFIX() {
    return 'o_saas_api_s_';
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

}

module.exports = new CoreConstant();