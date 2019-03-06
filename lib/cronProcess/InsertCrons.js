/**
 * Class to insert crons.
 *
 * @module lib/cronProcess/InsertCrons
 */

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  cronProcessConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

/**
 * Class to insert crons.
 *
 * @class
 */
class InsertCrons {
  /**
   * Insert cron.
   *
   * @param {String} cronKindName
   * @param {Object} cronParams
   *
   * @return {Promise<void>}
   */
  async perform(cronKindName, cronParams) {
    const oThis = this;

    switch (cronKindName) {
      // Sub-env specific.
      case cronProcessConstants.workflowWorker:
        return oThis.insertWorkflowWorkerEntry(cronParams);
      case cronProcessConstants.emailNotifier:
        return oThis.insertEmailNotifierEntry(cronParams);
      case cronProcessConstants.updateRealtimeGasPrice:
        return oThis.insertUpdateRealtimeGasPriceEntry(cronParams);

      // Origin chain specific.
      case cronProcessConstants.fundByMasterInternalFunderOriginChainSpecific:
        return oThis.insertFundByMasterInternalFunderOriginChainSpecificEntry(cronParams);

      // Common for origin and aux chains.
      case cronProcessConstants.blockParser:
        return oThis.insertBlockParserEntry(cronParams);
      case cronProcessConstants.transactionParser:
        return oThis.insertTransactionParserEntry(cronParams);
      case cronProcessConstants.blockFinalizer:
        return oThis.insertBlockFinalizerEntry(cronParams);

      // Aux chain specific.
      case cronProcessConstants.economyAggregator:
        return oThis.insertEconomyAggregatorEntry(cronParams);
      case cronProcessConstants.fundByMasterInternalFunderAuxChainSpecificChainAddresses:
        return oThis.insertFundByMasterInternalFunderAuxChainSpecificChainAddressesEntry(cronParams);
      case cronProcessConstants.fundBySealerAuxChainSpecific:
        return oThis.insertFundBySealerAuxChainSpecificEntry(cronParams);
      case cronProcessConstants.fundByTokenAuxFunderAuxChainSpecific:
        return oThis.insertFundByTokenAuxFunderAuxChainSpecificEntry(cronParams);
      case cronProcessConstants.updatePriceOraclePricePoints:
        return oThis.insertUpdatePriceOraclePricePointsEntry(cronParams);
      case cronProcessConstants.fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses:
        return oThis.insertFundByMasterInternalFunderAuxChainSpecificTokenFunderAddressesEntry(cronParams);
      case cronProcessConstants.fundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses:
        return oThis.insertFundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddressesEntry(cronParams);
      case cronProcessConstants.executeTransaction:
        return oThis.insertExecuteTransactionEntry(cronParams);
      case cronProcessConstants.auxWorkflowWorker:
        return oThis.insertAuxWorkflowWorkerTwoEntry(cronParams);
      case cronProcessConstants.fundByTokenAuxFunderToExTxWorkers:
        return oThis.insertFundByTokenAuxFunderToExTxWorkersEntry(cronParams);
      case cronProcessConstants.balanceSettler:
        return oThis.insertBalanceSettlerEntry(cronParams);
      case cronProcessConstants.originToAuxStateRootSync:
        return oThis.insertOriginToAuxStateRootSync(cronParams);
      case cronProcessConstants.auxToOriginStateRootSync:
        return oThis.insertAuxToOriginStateRootSync(cronParams);
      case cronProcessConstants.executeRecovery:
        return oThis.insertExecuteRecoveryEntry(cronParams);
      case cronProcessConstants.transactionErrorHandler:
        return oThis.insertTransactionErrorHandlerEntry(cronParams);

      default:
        throw new Error(`Un-recognized cron kind name: ${cronKindName}`);
    }
  }

  //--------------------------Sub-env specific-------------------

  /**
   * Insert workflowWorker cron entry.
   *
   * @param {Object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertWorkflowWorkerEntry(cronParams) {
    const WorkflowWorker = require(rootPrefix + '/lib/cronProcess/WorkflowWorker');
    logger.log('Creating workflowWorker');
    const workflowWorker = new WorkflowWorker({
      prefetchCount: cronParams.prefetchCount,
      chainId: cronParams.chainId,
      sequenceNumber: cronParams.sequenceNumber
    });
    return workflowWorker.perform();
  }

  /**
   * Insert emailNotifier cron entry.
   *
   * @param {Object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertEmailNotifierEntry(cronParams) {
    const EmailNotifier = require(rootPrefix + '/lib/cronProcess/EmailNotifier');
    logger.log('Creating emailNotifier');
    const emailNotifier = new EmailNotifier({
      prefetchCount: cronParams.prefetchCount,
      chainId: cronParams.chainId,
      sequenceNumber: cronParams.sequenceNumber
    });
    return emailNotifier.perform();
  }

  /**
   * Insert updateRealtimeGasPrice cron entry.
   *
   * @param {Object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertUpdateRealtimeGasPriceEntry(cronParams) {
    const UpdateRealtimeGasPrice = require(rootPrefix + '/lib/cronProcess/UpdateRealtimeGasPrice');
    logger.log('Creating updateRealtimeGasPrice');
    const updateRealtimeGasPrice = new UpdateRealtimeGasPrice({
      chainId: cronParams.chainId
    });
    return updateRealtimeGasPrice.perform();
  }

  //--------------------------Origin chain specific-------------------

  /**
   * Insert blockParser cron entry.
   *
   * @param {Object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertBlockParserEntry(cronParams) {
    const BlockParser = require(rootPrefix + '/lib/cronProcess/BlockParser');
    logger.log('Creating blockParser');
    const blockParser = new BlockParser({
      chainId: cronParams.chainId,
      intentionalBlockDelay: cronParams.intentionalBlockDelay
    });
    return blockParser.perform();
  }

  /**
   * Insert transactionParser cron entry.
   *
   * @param {Object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertTransactionParserEntry(cronParams) {
    const TransactionParser = require(rootPrefix + '/lib/cronProcess/TransactionParser');
    logger.log('Creating transactionParser');
    const transactionParser = new TransactionParser({
      chainId: cronParams.chainId,
      prefetchCount: cronParams.prefetchCount,
      sequenceNumber: cronParams.sequenceNumber
    });
    return transactionParser.perform();
  }

  /**
   * Insert blockFinalizer cron entry.
   *
   * @param {Object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertBlockFinalizerEntry(cronParams) {
    const BlockFinalizer = require(rootPrefix + '/lib/cronProcess/BlockFinalizer');
    logger.log('Creating blockFinalizer');
    const blockFinalizer = new BlockFinalizer({
      chainId: cronParams.chainId
    });
    return blockFinalizer.perform();
  }

  /**
   * Insert fundByMasterInternalFunderOriginChainSpecific cron entry.
   *
   * @param {Object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertFundByMasterInternalFunderOriginChainSpecificEntry(cronParams) {
    const FundByMasterInternalFunderOriginChainSpecific = require(rootPrefix +
      '/lib/cronProcess/fundByMasterInternalFunder/OriginChainSpecific');
    logger.log('Creating fundByMasterInternalFunderOriginChainSpecific');
    const fundByMasterInternalFunderOriginChainSpecific = new FundByMasterInternalFunderOriginChainSpecific({
      originChainId: cronParams.originChainId
    });
    return fundByMasterInternalFunderOriginChainSpecific.perform();
  }

  //--------------------------Aux chain specific-------------------

  /**
   * Insert economyAggregator cron entry.
   *
   * @param {Object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertEconomyAggregatorEntry(cronParams) {
    const EconomyAggregator = require(rootPrefix + '/lib/cronProcess/EconomyAggregator');
    logger.log('Creating economyAggregator');
    const economyAggregator = new EconomyAggregator({
      chainId: cronParams.chainId,
      prefetchCount: cronParams.prefetchCount
    });
    return economyAggregator.perform();
  }

  /**
   * Insert fundByMasterInternalFunderAuxChainSpecificChainAddresses cron entry.
   *
   * @param {Object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertFundByMasterInternalFunderAuxChainSpecificChainAddressesEntry(cronParams) {
    const FundByMasterInternalFunderAuxChainSpecificChainAddresses = require(rootPrefix +
      '/lib/cronProcess/fundByMasterInternalFunder/auxChainSpecific/ChainAddresses');
    logger.log('Creating fundByMasterInternalFunderAuxChainSpecificChainAddresses');
    const fundByMasterInternalFunderAuxChainSpecificChainAddresses = new FundByMasterInternalFunderAuxChainSpecificChainAddresses(
      {
        originChainId: cronParams.originChainId,
        auxChainId: cronParams.auxChainId
      }
    );
    return fundByMasterInternalFunderAuxChainSpecificChainAddresses.perform();
  }

  /**
   * Insert fundBySealerAuxChainSpecific cron entry.
   *
   * @param {Object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertFundBySealerAuxChainSpecificEntry(cronParams) {
    const FundBySealerAuxChainSpecific = require(rootPrefix + '/lib/cronProcess/fundBySealer/AuxChainSpecific');
    logger.log('Creating fundBySealerAuxChainSpecific');
    const fundBySealerAuxChainSpecific = new FundBySealerAuxChainSpecific({
      originChainId: cronParams.originChainId,
      auxChainId: cronParams.auxChainId
    });
    return fundBySealerAuxChainSpecific.perform();
  }

  /**
   * Insert fundByTokenAuxFunderAuxChainSpecific cron entry.
   *
   * @param {Object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertFundByTokenAuxFunderAuxChainSpecificEntry(cronParams) {
    const FundByTokenAuxFunderAuxChainSpecific = require(rootPrefix +
      '/lib/cronProcess/fundByTokenAuxFunder/AuxChainSpecific');
    logger.log('Creating fundByTokenAuxFunderAuxChainSpecific');
    const fundByTokenAuxFunderAuxChainSpecific = new FundByTokenAuxFunderAuxChainSpecific({
      originChainId: cronParams.originChainId,
      auxChainId: cronParams.auxChainId
    });
    return fundByTokenAuxFunderAuxChainSpecific.perform();
  }

  /**
   * Insert updatePriceOraclePricePoints cron entry.
   *
   * @param {Object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertUpdatePriceOraclePricePointsEntry(cronParams) {
    const UpdatePriceOraclePricePoints = require(rootPrefix + '/lib/cronProcess/UpdatePriceOraclePricePoints');
    logger.log('Creating updatePriceOraclePricePoints');
    const updatePriceOraclePricePoints = new UpdatePriceOraclePricePoints({
      auxChainId: cronParams.auxChainId
    });
    return updatePriceOraclePricePoints.perform();
  }

  /**
   * Insert fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses cron entry.
   *
   * @param {Object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertFundByMasterInternalFunderAuxChainSpecificTokenFunderAddressesEntry(cronParams) {
    const FundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses = require(rootPrefix +
      '/lib/cronProcess/fundByMasterInternalFunder/auxChainSpecific/TokenFunderAddresses');
    logger.log('Creating fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses');
    const fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses = new FundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses(
      {
        originChainId: cronParams.originChainId,
        auxChainId: cronParams.auxChainId
      }
    );
    return fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses.perform();
  }

  /**
   * Insert fundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses cron entry.
   *
   * @param {Object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertFundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddressesEntry(cronParams) {
    const FundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses = require(rootPrefix +
      '/lib/cronProcess/fundByMasterInternalFunder/auxChainSpecific/InterChainFacilitatorAddresses');
    logger.log('Creating fundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses');
    const fundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses = new FundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses(
      {
        originChainId: cronParams.originChainId,
        auxChainId: cronParams.auxChainId
      }
    );
    return fundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses.perform();
  }

  /**
   * Insert executeTransaction cron entry.
   *
   * @param {Object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertExecuteTransactionEntry(cronParams) {
    const ExecuteTransaction = require(rootPrefix + '/lib/cronProcess/ExecuteTransaction');
    logger.log('Creating executeTransaction one.');
    const executeTransaction = new ExecuteTransaction({
      prefetchCount: cronParams.prefetchCount,
      auxChainId: cronParams.auxChainId,
      sequenceNumber: cronParams.sequenceNumber,
      queueTopicSuffix: cronParams.queueTopicSuffix
    });
    return executeTransaction.perform();
  }

  /**
   * Insert auxWorkflowWorker cron entry.
   *
   * @param {Object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertAuxWorkflowWorkerTwoEntry(cronParams) {
    const AuxWorkflowWorker = require(rootPrefix + '/lib/cronProcess/AuxWorkflowWorker');
    logger.log('Creating auxWorkflowWorker.');
    const auxWorkflowWorker = new AuxWorkflowWorker({
      prefetchCount: cronParams.prefetchCount,
      auxChainId: cronParams.auxChainId,
      sequenceNumber: cronParams.sequenceNumber
    });
    return auxWorkflowWorker.perform();
  }

  /**
   * Insert fundByTokenAuxFunderToExTxWorkers cron entry.
   *
   * @param {Object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertFundByTokenAuxFunderToExTxWorkersEntry(cronParams) {
    const FundByTokenAuxFunderToExTxWorkers = require(rootPrefix +
      '/lib/cronProcess/fundByTokenAuxFunder/ToExTxWorkers');
    logger.log('Creating fundByTokenAuxFunderToExTxWorkers');
    const fundByTokenAuxFunderToExTxWorkers = new FundByTokenAuxFunderToExTxWorkers({
      originChainId: cronParams.originChainId,
      auxChainId: cronParams.auxChainId
    });
    return fundByTokenAuxFunderToExTxWorkers.perform();
  }

  /**
   * Insert balanceSettler cron entry.
   *
   * @param {Object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertBalanceSettlerEntry(cronParams) {
    const BalanceSettler = require(rootPrefix + '/lib/cronProcess/BalanceSettler');
    logger.log('Creating balanceSettler.');
    const balanceSettler = new BalanceSettler({
      prefetchCount: cronParams.prefetchCount,
      auxChainId: cronParams.auxChainId,
      sequenceNumber: cronParams.sequenceNumber
    });
    return balanceSettler.perform();
  }

  /**
   *
   * @param cronParams
   * @returns {Promise<Promise<void>|Promise>}
   */
  async insertOriginToAuxStateRootSync(cronParams) {
    const StateRootSyncOriginToAux = require(rootPrefix + '/lib/cronProcess/stateRootSync/OriginToAux');
    logger.log('Creating Origin to aux state root sync entry.');
    const stateRootSyncOriginToAuxObj = new StateRootSyncOriginToAux({
      auxChainId: cronParams.auxChainId,
      originChainId: cronParams.originChainId
    });
    return stateRootSyncOriginToAuxObj.perform();
  }

  async insertAuxToOriginStateRootSync(cronParams) {
    const StateRootSyncAuxToOrigin = require(rootPrefix + '/lib/cronProcess/stateRootSync/AuxToOrigin');
    logger.log('Creating aux to origin state root sync entry.');
    const stateRootSyncAuxToOriginObj = new StateRootSyncAuxToOrigin({
      auxChainId: cronParams.auxChainId,
      originChainId: cronParams.originChainId
    });
    return stateRootSyncAuxToOriginObj.perform();
  }

  async insertExecuteRecoveryEntry(cronParams) {
    const ExecuteRecovery = require(rootPrefix + '/lib/cronProcess/ExecuteRecovery');
    logger.log('Creating executeRecovery');
    const executeRecovery = new ExecuteRecovery({
      chainId: cronParams.chainId
    });
    return executeRecovery.perform();
  }

  async insertTransactionErrorHandlerEntry(cronParams) {
    const TransactionErrorHandlerKlass = require(rootPrefix + '/lib/cronProcess/TransactionErrorHandler');
    logger.log('Creating TransactionErrorHandler.');
    const TransactionErrorHandler = new TransactionErrorHandlerKlass({
      auxChainId: cronParams.auxChainId,
      noOfRowsToProcess: cronParams.noOfRowsToProcess,
      maxRetry: cronParams.maxRetry,
      sequenceNumber: cronParams.sequenceNumber
    });
    return TransactionErrorHandler.perform();
  }
}

module.exports = InsertCrons;
