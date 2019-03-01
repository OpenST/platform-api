'use strict';
/**
 * This script is used for creating initial set of AUX specific DDB tables used by SAAS
 *
 * @module executables/setup/aux/saasDdb
 */
const program = require('commander'),
  OSTBase = require('@ostdotcom/base');

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  shardConstant = require(rootPrefix + '/lib/globalConstant/shard'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

const InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/lib/shardManagement/Create');

program
  .option('--auxChainId <auxChainId>', 'Aux Chain id')
  .option('--userShardNoStr [userShardNoStr]', 'Comma seperated numbers for which user shards has be created')
  .option('--balanceShardNoStr [balanceShardNoStr]', 'Comma seperated numbers for which balance shards has be created')
  .option('--deviceShardNoStr [deviceShardNoStr]', 'Comma seperated numbers for which device shards has be created')
  .option('--sessionShardNoStr [sessionShardNoStr]', 'Comma seperated numbers for which session shards has be created')
  .parse(process.argv);

program.on('--help', () => {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(
    ' node executables/setup/aux/saasDdb.js --auxChainId 2000 --userShardNoStr 1,2,3 --deviceShardNoStr 1,2 --sessionShardNoStr 1,2 --balanceShardNoStr 1,2'
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
   * @param {Object} params
   * @param {Number} params.auxChainId - chain id
   * @param {Array} [params.userShardNos] - array of numbers using which shards are to be created
   * @param {Array} [params.balanceShardNos] - array of numbers using which shards are to be created
   * @param {Array} [params.deviceShardNos] - array of numbers using which shards are to be created
   * @param {Array} [params.sessionShardNos] - array of numbers using which shards are to be created
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;
    oThis.auxChainId = params.auxChainId;
    oThis.userShardNos = params.userShardNos;
    oThis.balanceShardNos = params.balanceShardNos;
    oThis.deviceShardNos = params.deviceShardNos;
    oThis.sessionShardNos = params.sessionShardNos;
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

    // Create User table(s)
    if (oThis.userShardNos.length > 0) {
      let userShardObject = new CreateShard({
        chainId: oThis.auxChainId,
        entityKind: shardConstant.userEntityKind,
        shardNumbers: oThis.userShardNos,
        isAvailableForAllocation: true
      });
      await userShardObject.perform();
    }

    // Create Device table(s)
    if (oThis.deviceShardNos.length > 0) {
      let deviceShardObject = new CreateShard({
        chainId: oThis.auxChainId,
        entityKind: shardConstant.deviceEntityKind,
        shardNumbers: oThis.deviceShardNos,
        isAvailableForAllocation: true
      });
      await deviceShardObject.perform();
    }

    // Create Session table(s)
    if (oThis.sessionShardNos.length > 0) {
      let sessionShardObject = new CreateShard({
        chainId: oThis.auxChainId,
        entityKind: shardConstant.sessionEntityKind,
        shardNumbers: oThis.sessionShardNos,
        isAvailableForAllocation: true
      });
      await sessionShardObject.perform();
    }

    // Create balance table(s)
    if (oThis.balanceShardNos.length > 0) {
      let balanceShardObject = new CreateShard({
        chainId: oThis.auxChainId,
        entityKind: shardConstant.balanceEntityKind,
        shardNumbers: oThis.balanceShardNos,
        isAvailableForAllocation: true
      });
      await balanceShardObject.perform();
    }
  }
}

/**
 * This method performs certain validations on the input params.
 */
const validateAndSanitize = function() {
  if (!program.auxChainId) {
    logger.error('Aux Chain Id missing');
    program.help();
    process.exit(1);
  }

  program.userShardNos = program.userShardNoStr ? basicHelper.commaSeperatedStrToArray(program.userShardNoStr) : [];
  program.balanceShardNos = program.balanceShardNoStr
    ? basicHelper.commaSeperatedStrToArray(program.balanceShardNoStr)
    : [];
  program.deviceShardNos = program.deviceShardNoStr
    ? basicHelper.commaSeperatedStrToArray(program.deviceShardNoStr)
    : [];
  program.sessionShardNos = program.sessionShardNoStr
    ? basicHelper.commaSeperatedStrToArray(program.sessionShardNoStr)
    : [];
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
