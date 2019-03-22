/**
 * Class to seed aux chain specific cron seeder.
 *
 * @module tools/localSetup/auxChainSpecificCronSeeder
 */

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  InsertCrons = require(rootPrefix + '/lib/cronProcess/InsertCrons'),
  cronProcessConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

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
    await oThis.insertFundByTokenAuxFunderToExTxWorkersEntry();
    await oThis.insertBalanceSettlerEntry();
    await oThis.insertExecuteRecoveryEntry();
    await oThis.insertStateRootSyncFromOriginToAux();
    await oThis.insertStateRootSyncFromAuxToOrigin();
    await oThis.insertTransactionErrorHandlerEntry();
    await oThis.insertTBalanceVerifierEntry();
  }

  /**
   * Insert blockParser cron entry.
   *
   * @return {Promise<*>}
   */
  async insertBlockParserEntry() {
    return new InsertCrons()
      .perform(cronProcessConstants.blockParser, {
        chainId: 2000,
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
        chainId: 2000,
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
        chainId: 2000
      })
      .then(function(insertId) {
        logger.log('InsertId: ', insertId);
      });
  }

  /**
   * Insert economyAggregator cron entry.
   *
   * @return {Promise<*>}
   */
  async insertEconomyAggregatorEntry() {
    return new InsertCrons()
      .perform(cronProcessConstants.economyAggregator, {
        chainId: 2000,
        prefetchCount: 1
      })
      .then(function(insertId) {
        logger.log('InsertId: ', insertId);
      });
  }

  /**
   * Insert fundByMasterInternalFunderAuxChainSpecificChainAddresses cron entry.
   *
   * @return {Promise<*>}
   */
  async insertFundByMasterInternalFunderAuxChainSpecificChainAddressesEntry() {
    return new InsertCrons()
      .perform(cronProcessConstants.fundByMasterInternalFunderAuxChainSpecificChainAddresses, {
        originChainId: 1000,
        auxChainId: 2000
      })
      .then(function(insertId) {
        logger.log('InsertId: ', insertId);
      });
  }

  /**
   * Insert fundBySealerAuxChainSpecific cron entry.
   *
   * @return {Promise<*>}
   */
  async insertFundBySealerAuxChainSpecificEntry() {
    return new InsertCrons()
      .perform(cronProcessConstants.fundBySealerAuxChainSpecific, {
        originChainId: 1000,
        auxChainId: 2000
      })
      .then(function(insertId) {
        logger.log('InsertId: ', insertId);
      });
  }

  /**
   * Insert fundByTokenAuxFunderAuxChainSpecific cron entry.
   *
   * @return {Promise<*>}
   */
  async insertFundByTokenAuxFunderAuxChainSpecificEntry() {
    return new InsertCrons()
      .perform(cronProcessConstants.fundByTokenAuxFunderAuxChainSpecific, {
        originChainId: 1000,
        auxChainId: 2000
      })
      .then(function(insertId) {
        logger.log('InsertId: ', insertId);
      });
  }

  /**
   * Insert updatePriceOraclePricePoints cron entry.
   *
   * @return {Promise<*>}
   */
  async insertUpdatePriceOraclePricePointsEntry() {
    return new InsertCrons()
      .perform(cronProcessConstants.updatePriceOraclePricePoints, {
        auxChainId: 2000
      })
      .then(function(insertId) {
        logger.log('InsertId: ', insertId);
      });
  }

  /**
   * Insert fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses cron entry.
   *
   * @return {Promise<*>}
   */
  async insertFundByMasterInternalFunderAuxChainSpecificTokenFunderAddressesEntry() {
    return new InsertCrons()
      .perform(cronProcessConstants.fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses, {
        originChainId: 1000,
        auxChainId: 2000
      })
      .then(function(insertId) {
        logger.log('InsertId: ', insertId);
      });
  }

  /**
   * Insert fundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses cron entry.
   *
   * @return {Promise<*>}
   */
  async insertFundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddressesEntry() {
    return new InsertCrons()
      .perform(cronProcessConstants.fundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses, {
        originChainId: 1000,
        auxChainId: 2000
      })
      .then(function(insertId) {
        logger.log('InsertId: ', insertId);
      });
  }

  /**
   * Insert executeTransaction cron entry.
   *
   * @return {Promise<*>}
   */
  async insertExecuteTransactionOneEntry() {
    return new InsertCrons()
      .perform(cronProcessConstants.executeTransaction, {
        prefetchCount: 5,
        auxChainId: 2000,
        sequenceNumber: 1,
        queueTopicSuffix: 'one'
      })
      .then(function(insertId) {
        logger.log('InsertId: ', insertId);
      });
  }

  /**
   * Insert executeTransaction cron entry.
   *
   * @return {Promise<*>}
   */
  async insertExecuteTransactionTwoEntry() {
    return new InsertCrons()
      .perform(cronProcessConstants.executeTransaction, {
        prefetchCount: 5,
        auxChainId: 2000,
        sequenceNumber: 2,
        queueTopicSuffix: 'two'
      })
      .then(function(insertId) {
        logger.log('InsertId: ', insertId);
      });
  }

  /**
   * Insert auxWorkflowWorker cron entry.
   *
   * @return {Promise<*>}
   */
  async insertAuxWorkflowWorkerTwoEntry() {
    return new InsertCrons()
      .perform(cronProcessConstants.auxWorkflowWorker, {
        prefetchCount: 5,
        auxChainId: 2000,
        sequenceNumber: 1
      })
      .then(function(insertId) {
        logger.log('InsertId: ', insertId);
      });
  }

  /**
   * Insert fundByTokenAuxFunderToExTxWorkers cron entry.
   *
   * @return {Promise<*>}
   */
  async insertFundByTokenAuxFunderToExTxWorkersEntry() {
    return new InsertCrons()
      .perform(cronProcessConstants.fundByTokenAuxFunderToExTxWorkers, {
        originChainId: 1000,
        auxChainId: 2000
      })
      .then(function(insertId) {
        logger.log('InsertId: ', insertId);
      });
  }

  /**
   * Insert balance settler cron entry.
   *
   * @returns {Promise<void>}
   */
  async insertBalanceSettlerEntry() {
    return new InsertCrons()
      .perform(cronProcessConstants.balanceSettler, {
        auxChainId: 2000,
        prefetchCount: 5,
        sequenceNumber: 1
      })
      .then(function(insertId) {
        logger.log('InsertId: ', insertId);
      });
  }

  /**
   * Insert state root sync from origin to aux cron entry.
   *
   * @returns {Promise<void>}
   */
  async insertStateRootSyncFromOriginToAux() {
    return new InsertCrons()
      .perform(cronProcessConstants.originToAuxStateRootSync, {
        auxChainId: 2000,
        originChainId: 1000
      })
      .then(function(insertId) {
        logger.log('InsertId: ', insertId);
      });
  }

  /**
   * Insert state root sync from aux to origin cron entry.
   *
   * @returns {Promise<void>}
   */
  async insertStateRootSyncFromAuxToOrigin() {
    return new InsertCrons()
      .perform(cronProcessConstants.auxToOriginStateRootSync, {
        auxChainId: 2000,
        originChainId: 1000
      })
      .then(function(insertId) {
        logger.log('InsertId: ', insertId);
      });
  }

  async insertExecuteRecoveryEntry() {
    return new InsertCrons()
      .perform(cronProcessConstants.executeRecovery, {
        chainId: 2000
      })
      .then(function(insertId) {
        logger.log('InsertId: ', insertId);
      });
  }

  async insertTransactionErrorHandlerEntry() {
    return new InsertCrons()
      .perform(cronProcessConstants.transactionErrorHandler, {
        auxChainId: 2000,
        noOfRowsToProcess: 5,
        maxRetry: 100,
        sequenceNumber: 1
      })
      .then(function(insertId) {
        logger.log('InsertId: ', insertId);
      });
  }

  async insertTBalanceVerifierEntry() {
    return new InsertCrons()
      .perform(cronProcessConstants.balanceVerifier, {
        auxChainId: 2000,
        timeStamp: 1552982847
      })
      .then(function(insertId) {
        logger.log('InsertId: ', insertId);
      });
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
