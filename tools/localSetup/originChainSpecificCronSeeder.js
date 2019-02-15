/**
 * Class to seed origin chain specific cron seeder.
 *
 * @module tools/localSetup/originChainSpecificCronSeeder
 */

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  BlockParser = require(rootPrefix + '/lib/cronProcess/BlockParser'),
  BlockFinalizer = require(rootPrefix + '/lib/cronProcess/BlockFinalizer'),
  TransactionParser = require(rootPrefix + '/lib/cronProcess/TransactionParser'),
  FundByMasterInternalFunderOriginChainSpecific = require(rootPrefix +
    '/lib/cronProcess/fundByMasterInternalFunder/OriginChainSpecific');

/**
 * Class to seed origin chain specific cron seeder.
 *
 * @class
 */
class OriginChainSpecificCronSeeder {
  /**
   * Main performer for class.
   *
   * @return {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis.insertBlockParserEntry();
    await oThis.insertTransactionParserEntry();
    await oThis.insertBlockFinalizerEntry();
    await oThis.insertFundByMasterInternalFunderOriginChainSpecificEntry();
  }

  /**
   * Insert blockParser cron entry.
   *
   * @return {Promise<*>}
   */
  async insertBlockParserEntry() {
    logger.log('Creating blockParser');
    const blockParser = new BlockParser({
      chainId: 1000,
      intentionalBlockDelay: 0
    });
    return blockParser.perform().then(console.log);
  }

  /**
   * Insert transactionParser cron entry.
   *
   * @return {Promise<*>}
   */
  async insertTransactionParserEntry() {
    logger.log('Creating transactionParser');
    const transactionParser = new TransactionParser({
      chainId: 1000,
      prefetchCount: 5,
      sequenceNumber: 1
    });
    return transactionParser.perform().then(console.log);
  }

  /**
   * Insert blockFinalizer cron entry.
   *
   * @return {Promise<*>}
   */
  async insertBlockFinalizerEntry() {
    logger.log('Creating blockFinalizer');
    const blockFinalizer = new BlockFinalizer({
      chainId: 1000,
      blockDelay: 24
    });
    return blockFinalizer.perform().then(console.log);
  }

  /**
   * Insert fundByMasterInternalFunderOriginChainSpecific cron entry.
   *
   * @return {Promise<*>}
   */
  async insertFundByMasterInternalFunderOriginChainSpecificEntry() {
    logger.log('Creating fundByMasterInternalFunderOriginChainSpecific');
    const fundByMasterInternalFunderOriginChainSpecific = new FundByMasterInternalFunderOriginChainSpecific({
      originChainId: 1000
    });
    return fundByMasterInternalFunderOriginChainSpecific.perform().then(console.log);
  }
}

module.exports = OriginChainSpecificCronSeeder;

new OriginChainSpecificCronSeeder()
  .perform()
  .then(function() {
    logger.win('Origin chain specific cron entries created.');
    process.exit(0);
  })
  .catch(function(error) {
    logger.error('Origin chain specific cron entries creation failed. Error: ', error);
    process.exit(1);
  });
