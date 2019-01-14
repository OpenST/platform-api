'use strict';
/**
 * This script is used for initial setup i.e.  to create shared tables.
 *
 * Usage: node tools/localSetup/block-scanner/initialSetup.js
 *
 * @module tools/localSetup/block-scanner/initialSetup
 */
const program = require('commander');

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner');

// Following require(s) for registering into instance composer

program.option('--chainId <chainId>', 'Chain id').parse(process.argv);

program.on('--help', () => {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(' node tools/localSetup/block-scanner/initialSetup.js --chainId 1000');
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
      logger.error(' In catch block of tools/localSetup/block-scanner/initialSetup.js::perform');

      return responseHelper.error({
        internal_error_identifier: 't_ls_bs_is_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: err,
        error_config: {}
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
      ChainCronData = blockScannerObj.model.ChainCronData;

    let chainObject = new Chain({}),
      shardsObject = new Shards({}),
      economyObject = new Economy({}),
      shardByBlockObject = new ShardByBlock({}),
      shardByTransactionsObject = new ShardByTransactions({}),
      shardByEconomyAddressObject = new ShardByEconomyAddress({}),
      chainCronDataObject = new ChainCronData({});

    // Create Chain table
    await chainObject.createTable();
    // Create Shard table
    await shardsObject.createTable();
    // Create ShardByBlock table
    await shardByBlockObject.createTable();
    // Create ShardByTransactions table
    await shardByTransactionsObject.createTable();
    // Create ShardByEconomyAddress table
    await shardByEconomyAddressObject.createTable();
    // Create Economy table
    await economyObject.createTable();

    // Create ChainCronData table
    await chainCronDataObject.createTable();
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
