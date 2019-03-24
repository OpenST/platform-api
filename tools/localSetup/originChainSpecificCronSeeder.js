/**
 * Class to seed origin chain specific cron seeder.
 *
 * @module tools/localSetup/originChainSpecificCronSeeder
 */

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  InsertCrons = require(rootPrefix + '/lib/cronProcess/InsertCrons'),
  cronProcessConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

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
    return new InsertCrons()
      .perform(cronProcessConstants.blockParser, {
        chainId: 3,
        intentionalBlockDelay: 0
      })
      .then(function(insertId) {
        logger.log('InsertId: ', insertId);
      });
  }

  /**
   * Insert transactionParser cron entry.
   *
   * @return {Promise<*>}
   */
  async insertTransactionParserEntry() {
    return new InsertCrons()
      .perform(cronProcessConstants.transactionParser, {
        chainId: 3,
        prefetchCount: 5,
        sequenceNumber: 1
      })
      .then(function(insertId) {
        logger.log('InsertId: ', insertId);
      });
  }

  /**
   * Insert blockFinalizer cron entry.
   *
   * @return {Promise<*>}
   */
  async insertBlockFinalizerEntry() {
    return new InsertCrons()
      .perform(cronProcessConstants.blockFinalizer, {
        chainId: 3
      })
      .then(function(insertId) {
        logger.log('InsertId: ', insertId);
      });
  }

  /**
   * Insert fundByMasterInternalFunderOriginChainSpecific cron entry.
   *
   * @return {Promise<*>}
   */
  async insertFundByMasterInternalFunderOriginChainSpecificEntry() {
    return new InsertCrons()
      .perform(cronProcessConstants.fundByMasterInternalFunderOriginChainSpecific, {
        originChainId: 3
      })
      .then(function(insertId) {
        logger.log('InsertId: ', insertId);
      });
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
