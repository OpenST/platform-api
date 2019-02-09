'use strict';
/**
 * This executable adds the required shards for a particular chain.
 *
 * @module /executables/setup/blockScanner/addChain
 */
const program = require('commander');

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner');

program
  .option('--chainId <chainId>', 'Chain id')
  .option('--networkId <networkId>', 'Network id')
  .option('--blockShardCount [blockShardCount]>', 'Number of block shards to be created')
  .option('--economyShardCount [economyShardCount]>', 'Number of economy shards to be created')
  .option('--economyAddressShardCount [economyAddressShardCount]', 'Number of economy address shards to be created')
  .option('--transactionShardCount [transactionShardCount]', 'Number of transaction shards to be created')
  .parse(process.argv);

program.on('--help', () => {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(
    '    node executables/setup/blockScanner/addChain.js --chainId 1000 --networkId 1 --blockShardCount 2 --economyShardCount 2 --economyAddressShardCount 2 --transactionShardCount 2'
  );
  logger.log('');
  logger.log('');
});

/**
 * Class for add chain executable.
 *
 * @class
 */
class AddChain {
  /**
   * Constructor for add chain executable.
   *
   * @param {Object} params
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.params = params;
    oThis.chainId = params.chainId;
  }

  /**
   * Main performer method for the class.
   *
   * @returns {Promise<void>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(err) {
      logger.error(' In catch block of executables/setup/blockScanner/addChain.js');

      return responseHelper.error({
        internal_error_identifier: 't_ls_bs_ac_1',
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
      blockScannerObj = await blockScannerProvider.getInstance([oThis.chainId]),
      AddChainService = blockScannerObj.service.addChain;

    let addChainObj = new AddChainService(oThis.params);

    await addChainObj.perform();
  }
}

/**
 * This method performs certain validations on the input params.
 */
const validateAndSanitize = function() {
  if (!program.chainId || !program.networkId) {
    program.help();
    process.exit(1);
  }
};

validateAndSanitize();

let addChain = new AddChain(program);
addChain
  .perform()
  .then(function() {
    logger.win('Shards added for the chain.');
    process.exit(0);
  })
  .catch(function(err) {
    logger.error('Faced error: ', err);
    process.exit(1);
  });
