'use strict';
/**
 * This script is used for creating initial set of AUX specific DDB tables used by SAAS
 *
 * @module executables/setup/aux/saasDdb
 */
const program = require('commander'),
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  shardConstant = require(rootPrefix + '/lib/globalConstant/shard'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

require(rootPrefix + '/lib/shardManagement/Create');

program
  .option('--auxChainId <auxChainId>', 'Aux Chain id')
  .option('--userShardNoStr [userShardNoStr]', 'Comma seperated numbers for which user shards has be created')
  .option('--deviceShardNoStr [deviceShardNoStr]', 'Comma seperated numbers for which device shards has be created')
  .option('--sessionShardNoStr [sessionShardNoStr]', 'Comma seperated numbers for which session shards has be created')
  .option(
    '--recoveryOwnerAddressShardNoStr [sessionShardNoStr]',
    'Comma seperated numbers for which recovery owner shards has be created'
  )
  .parse(process.argv);

program.on('--help', () => {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(
    ' node executables/setup/aux/saasDdb.js --auxChainId 2000 --userShardNoStr 1,2 --deviceShardNoStr 1,2 --sessionShardNoStr 1,2 --recoveryOwnerAddressShardNoStr 1,2'
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
   * @param {Array} params.userShardNos - array of numbers using which shards are to be created
   * @param {Array} params.deviceShardNos - array of numbers using which shards are to be created
   * @param {Array} params.sessionShardNos - array of numbers using which shards are to be created
   * @param {Array} params.recoveryOwnerAddressShardNos - array of numbers using which shards are to be created
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;
    oThis.auxChainId = params.auxChainId;
    oThis.userShardNos = params.userShardNos;
    oThis.deviceShardNos = params.deviceShardNos;
    oThis.sessionShardNos = params.sessionShardNos;
    oThis.recoveryOwnerAddressShardNos = params.recoveryOwnerAddressShardNos;
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
        shardNumbers: oThis.userShardNos,
        isAvailableForAllocation: true
      }),
      deviceShardObject = new CreateShard({
        chainId: oThis.auxChainId,
        entityKind: shardConstant.deviceEntityKind,
        shardNumbers: oThis.deviceShardNos,
        isAvailableForAllocation: true
      }),
      sessionShardObject = new CreateShard({
        chainId: oThis.auxChainId,
        entityKind: shardConstant.sessionEntityKind,
        shardNumbers: oThis.sessionShardNos,
        isAvailableForAllocation: true
      }),
      recoveryOwnerAddressShardObject = new CreateShard({
        chainId: oThis.auxChainId,
        entityKind: shardConstant.recoveryOwnerAddressEntityKind,
        shardNumbers: oThis.recoveryOwnerAddressShardNos,
        isAvailableForAllocation: true
      });

    // // Create User table(s)
    // await userShardObject.perform();
    //
    // // Create Device table(s)
    // await deviceShardObject.perform();
    //
    // // Create Session table(s)
    // await sessionShardObject.perform();

    // Create Recovery Owner Address table(s)
    await recoveryOwnerAddressShardObject.perform();
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

  if (
    !program.userShardNoStr ||
    !program.deviceShardNoStr ||
    !program.sessionShardNoStr ||
    !program.recoveryOwnerAddressShardNoStr
  ) {
    logger.error('Mandatory shard no str in params missing');
    program.help();
    process.exit(1);
  }

  program.userShardNos = basicHelper.commaSeperatedStrToArray(program.userShardNoStr);
  program.deviceShardNos = basicHelper.commaSeperatedStrToArray(program.deviceShardNoStr);
  program.sessionShardNos = basicHelper.commaSeperatedStrToArray(program.sessionShardNoStr);
  program.recoveryOwnerAddressShardNos = basicHelper.commaSeperatedStrToArray(program.recoveryOwnerAddressShardNoStr);
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
