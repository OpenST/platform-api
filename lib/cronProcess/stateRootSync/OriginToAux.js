/**
 * Inserts state root sync from origin chain to aux chain entry in cron processes table.
 *
 * @module lib/cronProcess/stateRootSync/OriginToAux
 */

const rootPrefix = '../../..',
  StateRootSyncCronBase = require(rootPrefix + '/lib/cronProcess/stateRootSync/Base'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

/**
 * Class for inserting state root sync from origin chain to aux chain entry in cron processes table.
 *
 * @class StateRootSyncOriginToAux
 */
class StateRootSyncOriginToAux extends StateRootSyncCronBase {
  /**
   * Constructor for inserting state root sync from origin chain to aux chain entry in cron processes table.
   *
   * @param {object} params
   * @param {number/string} params.originChainId
   * @param {number/string} params.auxChainId
   *
   * @constructor
   */
  constructor(params) {
    super(params);
  }

  /**
   * Get cron kind.
   */
  get getCronKind() {
    const oThis = this;
    oThis.cronKind = cronProcessesConstants.originToAuxStateRootSync;
  }
}

module.exports = StateRootSyncOriginToAux;
