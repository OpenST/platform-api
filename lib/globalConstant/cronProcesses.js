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

  get economyAggregator() {
    return 'economyAggregator';
  }

  get workflowWorker() {
    return 'workflowWorker';
  }

  get auxWorkflowWorker() {
    return 'auxWorkflowWorker';
  }

  get emailNotifier() {
    return 'emailNotifier';
  }

  get executeTransaction() {
    return 'executeTransaction';
  }

  get updateRealtimeGasPrice() {
    return 'updateRealTimeGasPrice';
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

  get updatePriceOraclePricePoints() {
    return 'updatePriceOraclePricePoints';
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
}

module.exports = new CronProcesses();
