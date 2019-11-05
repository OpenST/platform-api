'use strict';
/**
 * This script is used for initial setup i.e.  to create shared tables.
 *
 * @module executables/setup/blockScanner/initialSetup.js
 */
const program = require('commander');

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner');

program.option('--chainId <chainId>', 'Chain id').parse(process.argv);

program.on('--help', () => {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(' node executables/setup/blockScanner/initialSetup.js --chainId 3');
  logger.log('');
  logger.log('');
});

/**
 * Class for initial setup
 *
 * @class
 */
class InitialSetup {
  /**
   * Constructor for initial setup
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

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
      logger.error(`In catch block of ${__filename}`);
      return responseHelper.error({
        internal_error_identifier: 't_ls_bs_is_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: { err: err.toString() }
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
      Chain = blockScannerObj.model.Chain,
      Shards = blockScannerObj.model.Shard,
      Economy = blockScannerObj.model.Economy,
      ShardByBlock = blockScannerObj.model.ShardByBlock,
      ShardByTransactions = blockScannerObj.model.ShardByTransaction,
      ShardByEconomyAddress = blockScannerObj.model.ShardByEconomyAddress,
      ChainCronData = blockScannerObj.model.ChainCronData,
      LatestPricePoint = blockScannerObj.model.LatestPricePoint;

    // Create Chain table
    await new Chain({}).createTable();
    // Create Shard table
    await new Shards({}).createTable();
    // Create ShardByBlock table
    await new ShardByBlock({}).createTable();
    // Create ShardByTransactions table
    await new ShardByTransactions({}).createTable();
    // Create ShardByEconomyAddress table
    await new ShardByEconomyAddress({}).createTable();
    // Create Economy table
    await new Economy({}).createTable();
    // Create ChainCronData table
    await new ChainCronData({}).createTable();
    // Create  LatestPricePoint table.
    await new LatestPricePoint({}).createTable();
  }
}

/**
 * This method performs certain validations on the input params.
 */
const validateAndSanitize = function() {
  if (!program.chainId) {
    program.help();
    process.exit(1);
  }
};

validateAndSanitize();

let setupInit = new InitialSetup(program);
setupInit
  .perform()
  .then(function() {
    logger.win('Tables created.');
    process.exit(0);
  })
  .catch(function(err) {
    logger.error('Faced error: ', err);
    process.exit(1);
  });
