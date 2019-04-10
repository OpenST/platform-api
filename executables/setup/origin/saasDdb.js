/**
 * This script is used for creating initial set of ORIGIN specific DDB tables used by SAAS.
 *
 * @module executables/setup/origin/saasDdb
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/app/models/ddb/shared/Shard');
require(rootPrefix + '/app/models/ddb/shared/ShardByToken');
require(rootPrefix + '/app/models/ddb/shared/BaseCurrency');

/**
 * Class to create initial DDB tables for SAAS.
 *
 * @class CreateInitialDdbTablesForSaas
 */
class CreateInitialDdbTablesForSaas {
  /**
   * Main performer method for the class.
   *
   * @returns {Promise<void>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(err) {
      logger.error(`${__filename}::perform`);

      return responseHelper.error({
        internal_error_identifier: 't_ls_ddb_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: err
      });
    });
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const strategyByChainHelper = new StrategyByChainHelper(0, 0),
      strategyFetchRsp = await strategyByChainHelper.getComplete(),
      configStrategy = strategyFetchRsp.data,
      ic = new InstanceComposer(configStrategy),
      ShardModel = ic.getShadowedClassFor(coreConstants.icNameSpace, 'ShardModel'),
      BaseCurrencyModel = ic.getShadowedClassFor(coreConstants.icNameSpace, 'BaseCurrency'),
      ShardByTokenModel = ic.getShadowedClassFor(coreConstants.icNameSpace, 'ShardByTokenModel');

    const shardsObject = new ShardModel({}),
      baseCurrencyObject = new BaseCurrencyModel({}),
      shardByTokenObject = new ShardByTokenModel({});

    // Create Shards table.
    await shardsObject.createTable();

    // Create Shard By Tokens table.
    await shardByTokenObject.createTable();

    // Create Base Currencies table.
    await baseCurrencyObject.createTable();
  }
}

const setupInit = new CreateInitialDdbTablesForSaas();

setupInit
  .perform()
  .then(function() {
    logger.win('Created Initial Origin Ddb Tables For Saas.');
    process.exit(0);
  })
  .catch(function(err) {
    logger.error('Faced error: ', err);
    process.exit(1);
  });
