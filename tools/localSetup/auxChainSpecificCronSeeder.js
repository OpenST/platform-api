/**
 * Class to seed aux chain specific cron seeder.
 *
 * @module tools/localSetup/auxChainSpecificCronSeeder
 */

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  BlockParser = require(rootPrefix + '/lib/cronProcess/BlockParser'),
  BlockFinalizer = require(rootPrefix + '/lib/cronProcess/BlockFinalizer'),
  TransactionParser = require(rootPrefix + '/lib/cronProcess/TransactionParser'),
  EconomyAggregator = require(rootPrefix + '/lib/cronProcess/EconomyAggregator'),
  AuxWorkflowWorker = require(rootPrefix + '/lib/cronProcess/AuxWorkflowWorker'),
  ExecuteTransaction = require(rootPrefix + '/lib/cronProcess/ExecuteTransaction'),
  FundBySealerAuxChainSpecific = require(rootPrefix + '/lib/cronProcess/FundBySealerAuxChainSpecific'),
  UpdatePriceOraclePricePoints = require(rootPrefix + '/lib/cronProcess/UpdatePriceOraclePricePoints'),
  FundByTokenAuxFunderAuxChainSpecific = require(rootPrefix + '/lib/cronProcess/FundByTokenAuxFunderAuxChainSpecific'),
  FundByMasterInternalFunderAuxChainSpecificChainAddresses = require(rootPrefix +
    '/lib/cronProcess/FundByMasterInternalFunderAuxChainSpecificChainAddresses'),
  FundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses = require(rootPrefix +
    '/lib/cronProcess/FundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses'),
  FundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses = require(rootPrefix +
    '/lib/cronProcess/FundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses');

/**
 * Class to seed aux chain specific cron seeder.
 *
 * @class
 */
class AuxChainSpecificCronSeeder {
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
    await oThis.insertEconomyAggregatorEntry();
    await oThis.insertFundByMasterInternalFunderAuxChainSpecificChainAddressesEntry();
    await oThis.insertFundBySealerAuxChainSpecificEntry();
    await oThis.insertFundByTokenAuxFunderAuxChainSpecificEntry();
    await oThis.insertUpdatePriceOraclePricePointsEntry();
    await oThis.insertFundByMasterInternalFunderAuxChainSpecificTokenFunderAddressesEntry();
    await oThis.insertFundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddressesEntry();
    await oThis.insertExecuteTransactionOneEntry();
    await oThis.insertExecuteTransactionTwoEntry();
    await oThis.insertAuxWorkflowWorkerTwoEntry();
  }

  /**
   * Insert blockParser cron entry.
   *
   * @return {Promise<*>}
   */
  async insertBlockParserEntry() {
    logger.log('Creating blockParser');
    const blockParser = new BlockParser({
      chainId: 2000,
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
      chainId: 2000,
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
      chainId: 2000,
      blockDelay: 6
    });
    return blockFinalizer.perform().then(console.log);
  }

  /**
   * Insert economyAggregator cron entry.
   *
   * @return {Promise<*>}
   */
  async insertEconomyAggregatorEntry() {
    logger.log('Creating economyAggregator');
    const economyAggregator = new EconomyAggregator({
      chainId: 2000,
      prefetchCount: 1
    });
    return economyAggregator.perform().then(console.log);
  }

  /**
   * Insert fundByMasterInternalFunderAuxChainSpecificChainAddresses cron entry.
   *
   * @return {Promise<*>}
   */
  async insertFundByMasterInternalFunderAuxChainSpecificChainAddressesEntry() {
    logger.log('Creating fundByMasterInternalFunderAuxChainSpecificChainAddresses');
    const fundByMasterInternalFunderAuxChainSpecificChainAddresses = new FundByMasterInternalFunderAuxChainSpecificChainAddresses(
      {
        originChainId: 1000,
        auxChainId: 2000
      }
    );
    return fundByMasterInternalFunderAuxChainSpecificChainAddresses.perform().then(console.log);
  }

  /**
   * Insert fundBySealerAuxChainSpecific cron entry.
   *
   * @return {Promise<*>}
   */
  async insertFundBySealerAuxChainSpecificEntry() {
    logger.log('Creating fundBySealerAuxChainSpecific');
    const fundBySealerAuxChainSpecific = new FundBySealerAuxChainSpecific({
      originChainId: 1000,
      auxChainId: 2000
    });
    return fundBySealerAuxChainSpecific.perform().then(console.log);
  }

  /**
   * Insert fundByTokenAuxFunderAuxChainSpecific cron entry.
   *
   * @return {Promise<*>}
   */
  async insertFundByTokenAuxFunderAuxChainSpecificEntry() {
    logger.log('Creating fundByTokenAuxFunderAuxChainSpecific');
    const fundByTokenAuxFunderAuxChainSpecific = new FundByTokenAuxFunderAuxChainSpecific({
      originChainId: 1000,
      auxChainId: 2000
    });
    return fundByTokenAuxFunderAuxChainSpecific.perform().then(console.log);
  }

  /**
   * Insert updatePriceOraclePricePoints cron entry.
   *
   * @return {Promise<*>}
   */
  async insertUpdatePriceOraclePricePointsEntry() {
    logger.log('Creating updatePriceOraclePricePoints');
    const updatePriceOraclePricePoints = new UpdatePriceOraclePricePoints({
      auxChainId: 2000
    });
    return updatePriceOraclePricePoints.perform().then(console.log);
  }

  /**
   * Insert fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses cron entry.
   *
   * @return {Promise<*>}
   */
  async insertFundByMasterInternalFunderAuxChainSpecificTokenFunderAddressesEntry() {
    logger.log('Creating fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses');
    const fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses = new FundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses(
      {
        originChainId: 1000,
        auxChainId: 2000
      }
    );
    return fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses.perform().then(console.log);
  }

  /**
   * Insert fundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses cron entry.
   *
   * @return {Promise<*>}
   */
  async insertFundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddressesEntry() {
    logger.log('Creating fundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses');
    const fundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses = new FundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses(
      {
        originChainId: 1000,
        auxChainId: 2000
      }
    );
    return fundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses.perform().then(console.log);
  }

  /**
   * Insert executeTransaction cron entry.
   *
   * @return {Promise<*>}
   */
  async insertExecuteTransactionOneEntry() {
    logger.log('Creating executeTransaction one.');
    const executeTransaction = new ExecuteTransaction({
      prefetchCount: 5,
      auxChainId: 2000,
      sequenceNumber: 1,
      queueTopicSuffix: 'one'
    });
    return executeTransaction.perform().then(console.log);
  }

  /**
   * Insert executeTransaction cron entry.
   *
   * @return {Promise<*>}
   */
  async insertExecuteTransactionTwoEntry() {
    logger.log('Creating executeTransaction two.');
    const executeTransaction = new ExecuteTransaction({
      prefetchCount: 5,
      auxChainId: 2000,
      sequenceNumber: 2,
      queueTopicSuffix: 'two'
    });
    return executeTransaction.perform().then(console.log);
  }

  /**
   * Insert auxWorkflowWorker cron entry.
   *
   * @return {Promise<*>}
   */
  async insertAuxWorkflowWorkerTwoEntry() {
    logger.log('Creating auxWorkflowWorker.');
    const auxWorkflowWorker = new AuxWorkflowWorker({
      prefetchCount: 5,
      auxChainId: 2000,
      sequenceNumber: 1
    });
    return auxWorkflowWorker.perform().then(console.log);
  }
}

module.exports = AuxChainSpecificCronSeeder;

new AuxChainSpecificCronSeeder()
  .perform()
  .then(function() {
    logger.win('Aux chain specific cron entries created.');
    process.exit(0);
  })
  .catch(function(error) {
    logger.error('Aux chain specific cron entries creation failed. Error: ', error);
    process.exit(1);
  });
