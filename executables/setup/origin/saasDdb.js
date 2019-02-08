'use strict';
/**
 * This script is used for creating initial set of ORIGIN specific DDB tables used by SAAS
 *
 * @module executables/setup/origin/saasDdb
 */
const OSTBase = require('@openstfoundation/openst-base');

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

const InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/app/models/ddb/shared/Shard');
require(rootPrefix + '/app/models/ddb/shared/ShardByToken');

/**
 *
 * @class
 */
class CreateInitialDdbTablesForSaas {
  /**
   * Constructor
   *
   * @constructor
   */
  constructor() {}

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
    const oThis = this,
      strategyByChainHelper = new StrategyByChainHelper(0, 0),
      strategyFetchRsp = await strategyByChainHelper.getComplete(),
      configStrategy = strategyFetchRsp.data,
      ic = new InstanceComposer(configStrategy),
      ShardModel = ic.getShadowedClassFor(coreConstants.icNameSpace, 'ShardModel'),
      ShardByTokenModel = ic.getShadowedClassFor(coreConstants.icNameSpace, 'ShardByTokenModel');

    let shardsObject = new ShardModel({}),
      shardByTokenObject = new ShardByTokenModel({});

    // Create Shards table
    await shardsObject.createTable();

    // Create Shard By Tokens table
    await shardByTokenObject.createTable();
  }
}

let setupInit = new CreateInitialDdbTablesForSaas();
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
