'use strict';
/**
 * This script is used for creating initial set of AUX specific DDB tables used by SAAS
 *
 * @module executables/setup/aux/saasDdb
 */
const program = require('commander'),
  OSTBase = require('@openstfoundation/openst-base');

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  shardConstant = require(rootPrefix + '/lib/globalConstant/shard'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

const InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/lib/shardManagement/Create');

program
  .option('--auxChainId <auxChainId>', 'Aux Chain id')
  .option('--userShardCount [userShardCount]', 'Number of user shards to be created')
  .option('--deviceShardCount [deviceShardCount]', 'Number of device shards to be created')
  .option('--sessionShardCount [sessionShardCount]', 'Number of sessions address shards to be created')
  .parse(process.argv);

program.on('--help', () => {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  // TODO - userShardCount, deviceShardCount, sessionShardCount - this should be array of shard numbers
  logger.log(
    ' node executables/setup/aux/saasDdb.js --auxChainId 2000 --userShardCount 2 --deviceShardCount 2 --sessionShardCount 2'
  );
  logger.log('');
  logger.log('');
});

/**
 *
 * @class
 */
class CreateInitialAuxDdbTablesForSaas {
  /**
   * Constructor
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;
    oThis.auxChainId = params.auxChainId;
    oThis.userShardCount = params.userShardCount;
    oThis.deviceShardCount = params.deviceShardCount;
    oThis.sessionShardCount = params.sessionShardCount;
  }

  /**
   * Perform
   *
   * @returns {Promise<void>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(err) {
      logger.error(`${__filename}::perform`);

      return responseHelper.error({
        internal_error_identifier: 'e_s_a_sd_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: err
      });
    });
  }

  /**
   * Async perform
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this,
      strategyByChainHelper = new StrategyByChainHelper(oThis.auxChainId),
      strategyFetchRsp = await strategyByChainHelper.getComplete(),
      configStrategy = strategyFetchRsp.data,
      ic = new InstanceComposer(configStrategy),
      CreateShard = ic.getShadowedClassFor(coreConstants.icNameSpace, 'CreateShard');

    let userShardObject = new CreateShard({
        chainId: oThis.auxChainId,
        entityKind: shardConstant.userEntityKind,
        shardNumbers: oThis._generateShardNumbersArray(oThis.userShardCount),
        isAvailableForAllocation: true
      }),
      deviceShardObject = new CreateShard({
        chainId: oThis.auxChainId,
        entityKind: shardConstant.deviceEntityKind,
        shardNumbers: oThis._generateShardNumbersArray(oThis.deviceShardCount),
        isAvailableForAllocation: true
      });
    // , sessionShardObject = new CreateShard({
    //   chainId: oThis.auxChainId,
    //   entityKind: shardConstant.sessionEntityKind,
    //   shardNumbers: oThis._generateShardNumbersArray(oThis.sessionShardCount),
    //   isAvailableForAllocation: true
    // })

    // Create User table(s)
    await userShardObject.perform();

    // Create Device table(s)
    await deviceShardObject.perform();

    // Create Session table(s)
    // await sessionShardObject.perform();
  }

  /**
   *
   * @param count
   * @return {Array}
   * @private
   */
  _generateShardNumbersArray(count) {
    const oThis = this;
    let shardNumbers = [];
    for (let i = 1; i <= parseInt(count); i++) {
      shardNumbers.push(i);
    }
    return shardNumbers;
  }
}

/**
 * This method performs certain validations on the input params.
 */
const validateAndSanitize = function() {
  if (!program.auxChainId) {
    program.help();
    process.exit(1);
  }

  if (!program.userShardCount) {
    program.userShardCount = 1;
  }

  if (!program.deviceShardCount) {
    program.deviceShardCount = 1;
  }

  if (!program.sessionShardCount) {
    program.sessionShardCount = 1;
  }
};

validateAndSanitize();

let setupInit = new CreateInitialAuxDdbTablesForSaas(program);
setupInit
  .perform()
  .then(function() {
    logger.win('Created Initial Aux Ddb Tables For Saas.');
    process.exit(0);
  })
  .catch(function(err) {
    logger.error('Faced error: ', err);
    process.exit(1);
  });
