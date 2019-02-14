/**
 * Class to insert crons.
 *
 * @module devops/exec/InsertCrons
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
      case [cronProcessConstants.workflowWorker]:
        return oThis.insertWorkflowWorkerEntry(cronParams);
      case [cronProcessConstants.emailNotifier]:
        return oThis.insertEmailNotifierEntry(cronParams);
      case [cronProcessConstants.updateRealtimeGasPrice]:
        return oThis.insertUpdateRealtimeGasPriceEntry(cronParams);

      // Origin chain specific.
      case [cronProcessConstants.blockParser]:
        return oThis.insertBlockParserEntry(cronParams);
      case [cronProcessConstants.transactionParser]:
        return oThis.insertTransactionParserEntry(cronParams);
      case [cronProcessConstants.blockFinalizer]:
        return oThis.insertBlockFinalizerEntry(cronParams);
      case [cronProcessConstants.fundByMasterInternalFunderOriginChainSpecific]:
        return oThis.insertFundByMasterInternalFunderOriginChainSpecificEntry(cronParams);

      // Aux chain specific.
      case [cronProcessConstants.economyAggregator]:
        return oThis.insertEconomyAggregatorEntry(cronParams);
      case [cronProcessConstants.fundByMasterInternalFunderAuxChainSpecificChainAddresses]:
        return oThis.insertFundByMasterInternalFunderAuxChainSpecificChainAddressesEntry(cronParams);
      case [cronProcessConstants.fundBySealerAuxChainSpecific]:
        return oThis.insertFundBySealerAuxChainSpecificEntry(cronParams);
      case [cronProcessConstants.fundByTokenAuxFunderAuxChainSpecific]:
        return oThis.insertFundByTokenAuxFunderAuxChainSpecificEntry(cronParams);
      case [cronProcessConstants.updatePriceOraclePricePoints]:
        return oThis.insertUpdatePriceOraclePricePointsEntry(cronParams);
      case [cronProcessConstants.fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses]:
        return oThis.insertFundByMasterInternalFunderAuxChainSpecificTokenFunderAddressesEntry(cronParams);
      case [cronProcessConstants.fundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses]:
        return oThis.insertFundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddressesEntry(cronParams);
      case [cronProcessConstants.executeTransaction]:
        return oThis.insertExecuteTransactionEntry(cronParams);
      case [cronProcessConstants.auxWorkflowWorker]:
        return oThis.insertAuxWorkflowWorkerTwoEntry(cronParams);

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
    return workflowWorker.perform().then(console.log);
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
      chainId: cronParams.chainId
    });
    return emailNotifier.perform().then(console.log);
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
    return updateRealtimeGasPrice.perform().then(console.log);
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
    return blockParser.perform().then(console.log);
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
    return transactionParser.perform().then(console.log);
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
      chainId: cronParams.chainId,
      blockDelay: cronParams.blockDelay
    });
    return blockFinalizer.perform().then(console.log);
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
      '/lib/cronProcess/FundByMasterInternalFunderOriginChainSpecific');
    logger.log('Creating fundByMasterInternalFunderOriginChainSpecific');
    const fundByMasterInternalFunderOriginChainSpecific = new FundByMasterInternalFunderOriginChainSpecific({
      originChainId: cronParams.originChainId
    });
    return fundByMasterInternalFunderOriginChainSpecific.perform().then(console.log);
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
    return economyAggregator.perform().then(console.log);
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
      '/lib/cronProcess/FundByMasterInternalFunderAuxChainSpecificChainAddresses');
    logger.log('Creating fundByMasterInternalFunderAuxChainSpecificChainAddresses');
    const fundByMasterInternalFunderAuxChainSpecificChainAddresses = new FundByMasterInternalFunderAuxChainSpecificChainAddresses(
      {
        originChainId: cronParams.originChainId,
        auxChainId: cronParams.auxChainId
      }
    );
    return fundByMasterInternalFunderAuxChainSpecificChainAddresses.perform().then(console.log);
  }

  /**
   * Insert fundBySealerAuxChainSpecific cron entry.
   *
   * @param {Object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertFundBySealerAuxChainSpecificEntry(cronParams) {
    const FundBySealerAuxChainSpecific = require(rootPrefix + '/lib/cronProcess/FundBySealerAuxChainSpecific');
    logger.log('Creating fundBySealerAuxChainSpecific');
    const fundBySealerAuxChainSpecific = new FundBySealerAuxChainSpecific({
      originChainId: cronParams.originChainId,
      auxChainId: cronParams.auxChainId
    });
    return fundBySealerAuxChainSpecific.perform().then(console.log);
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
      '/lib/cronProcess/FundByTokenAuxFunderAuxChainSpecific');
    logger.log('Creating fundByTokenAuxFunderAuxChainSpecific');
    const fundByTokenAuxFunderAuxChainSpecific = new FundByTokenAuxFunderAuxChainSpecific({
      originChainId: cronParams.originChainId,
      auxChainId: cronParams.auxChainId
    });
    return fundByTokenAuxFunderAuxChainSpecific.perform().then(console.log);
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
    return updatePriceOraclePricePoints.perform().then(console.log);
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
      '/lib/cronProcess/FundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses');
    logger.log('Creating fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses');
    const fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses = new FundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses(
      {
        originChainId: cronParams.originChainId,
        auxChainId: cronParams.auxChainId
      }
    );
    return fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses.perform().then(console.log);
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
      '/lib/cronProcess/FundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses');
    logger.log('Creating fundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses');
    const fundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses = new FundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses(
      {
        originChainId: cronParams.originChainId,
        auxChainId: cronParams.auxChainId
      }
    );
    return fundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses.perform().then(console.log);
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
    return executeTransaction.perform().then(console.log);
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
    return auxWorkflowWorker.perform().then(console.log);
  }
}
