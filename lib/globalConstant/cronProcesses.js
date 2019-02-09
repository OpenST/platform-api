'use strict';

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
  /**
   * Constructor for cron process constants
   *
   * @constructor
   */
  constructor() {}

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

  get emailNotifier() {
    return 'emailNotifier';
  }

  get executeTransaction() {
    return 'executeTransaction';
  }

  get updateRealtimeGasPrice() {
    return 'updateRealTimeGasPrice';
  }

  get fundEth() {
    return 'fundEth';
  }

  get fundStPrime() {
    return 'fundStPrime';
  }

  get fundByMasterInternalFunderOriginChainSpecific() {
    return 'fundByMasterInternalFunderOriginChainSpecific';
  }

  get fundByChainOwnerAuxChainSpecificChainAddresses() {
    return 'fundByChainOwnerAuxChainSpecificChainAddresses';
  }

  get fundByChainOwnerAuxChainSpecificTokenFunderAddresses() {
    return 'fundByChainOwnerAuxChainSpecificTokenFunderAddresses';
  }

  get fundByChainOwnerAuxChainSpecificInterChainFacilitatorAddresses() {
    return 'fundByChainOwnerAuxChainSpecificInterChainFacilitatorAddresses';
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
  //Status enum types end
}

module.exports = new CronProcesses();
