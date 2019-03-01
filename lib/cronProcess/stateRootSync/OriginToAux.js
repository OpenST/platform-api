/**
 * Inserts state root sync from origin chain to aux chain entry in cron processes table.
 *
 * @module lib/cronProcess/stateRootSync/OriginToAux
 */

const rootPrefix = '../../..',
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  StateRootSyncCronBase = require(rootPrefix + '/lib/cronProcess/stateRootSync/Base');

/**
 * Class for inserting state root sync from origin chain to aux chain entry in cron processes table.
 *
 * @class
 */
class StateRootSyncOriginToAux extends StateRootSyncCronBase {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Number/String} params.originChainId
   * @param {Number/String} params.auxChainId
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
