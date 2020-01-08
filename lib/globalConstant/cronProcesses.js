/**
 * Model to get cron process and its details.
 *
 * @module /lib/globalConstant/cronProcesses
 */

/**
 * Class for cron process constants
 *
 * @class
 */
class CronProcesses {
  // Cron processes enum types start
  get blockParser() {
    return 'blockParser';
  }

  get transactionParser() {
    return 'transactionParser';
  }

  get blockFinalizer() {
    return 'blockFinalizer';
  }

  get balanceSettler() {
    return 'balanceSettler';
  }

  get transactionErrorHandler() {
    return 'transactionErrorHandler';
  }

  get transactionFinalizer() {
    return 'transactionFinalizer';
  }

  get economyAggregator() {
    return 'economyAggregator';
  }

  get workflowWorker() {
    return 'workflowWorker';
  }

  get auxWorkflowWorker() {
    return 'auxWorkflowWorker';
  }

  get cronProcessesMonitor() {
    return 'cronProcessesMonitor';
  }

  get executeTransaction() {
    return 'executeTransaction';
  }

  get updateRealtimeGasPrice() {
    return 'updateRealTimeGasPrice';
  }

  get recoveryRequestsMonitor() {
    return 'recoveryRequestsMonitor';
  }

  get fundByMasterInternalFunderOriginChainSpecific() {
    return 'fundByMasterInternalFunderOriginChainSpecific';
  }

  get fundByMasterInternalFunderAuxChainSpecificChainAddresses() {
    return 'fundByMasterInternalFunderAuxChainSpecificChainAddresses';
  }

  get fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses() {
    return 'fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses';
  }

  get fundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses() {
    return 'fundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses';
  }

  get fundBySealerAuxChainSpecific() {
    return 'fundBySealerAuxChainSpecific';
  }

  get fundByTokenAuxFunderAuxChainSpecific() {
    return 'fundByTokenAuxFunderAuxChainSpecific';
  }

  get fundByTokenAuxFunderToExTxWorkers() {
    return 'fundByTokenAuxFunderToExTxWorkers';
  }

  get updatePriceOraclePricePoints() {
    return 'updatePriceOraclePricePoints';
  }

  get originToAuxStateRootSync() {
    return 'originToAuxStateRootSync';
  }

  get auxToOriginStateRootSync() {
    return 'auxToOriginStateRootSync';
  }

  get executeRecovery() {
    return 'executeRecovery';
  }

  get balanceVerifier() {
    return 'balanceVerifier';
  }

  get generateGraph() {
    return 'generateGraph';
  }

  get webhookPreprocessor() {
    return 'webhookPreprocessor';
  }

  get webhookProcessor() {
    return 'webhookProcessor';
  }

  get webhookErrorHandler() {
    return 'webhookErrorHandler';
  }

  get trackLatestTransaction() {
    return 'trackLatestTransaction';
  }

  // Cron processes enum types end

  // Status enum types start
  get runningStatus() {
    return 'running';
  }

  get stoppedStatus() {
    return 'stopped';
  }

  get inactiveStatus() {
    return 'inactive';
  }
  // Status enum types end

  // Chain id key starts.
  get chainIdKey() {
    return 'chainId';
  }

  get originChainIdKey() {
    return 'originChainId';
  }

  get auxChainIdKey() {
    return 'auxChainId';
  }
  // Chain id key ends.

  // Restart timeouts for crons.
  get continuousCronRestartInterval() {
    return 30 * 60 * 1000;
  }

  get cronRestartInterval15Mins() {
    return 15 * 60 * 1000;
  }

  get cronRestartInterval5Mins() {
    return 5 * 60 * 1000;
  }

  get stateRootSyncCronsRestartInterval() {
    return 10 * 60 * 1000;
  }

  // Cron types based on running time.
  get continuousCronsType() {
    return 'continuousCrons';
  }

  get periodicCronsType() {
    return 'periodicCrons';
  }

  get networkStatusUpgradeOngoing() {
    return 'ongoing';
  }

  get networkStatusUpgradeDone() {
    return 'done';
  }

  get networkStatusPostUpgradeCatchUp() {
    return 'postUpgradeCatchUp';
  }
}

module.exports = new CronProcesses();
