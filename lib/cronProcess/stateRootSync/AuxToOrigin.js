/**
 * Inserts state root sync from aux chain to origin chain entry in cron processes table.
 *
 * @module lib/cronProcess/stateRootSync/AuxToOrigin
 */

const rootPrefix = '../../..',
  StateRootSyncCronBase = require(rootPrefix + '/lib/cronProcess/stateRootSync/Base'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

/**
 * Class for inserting state root sync from aux chain to origin chain entry in cron processes table.
 *
 * @class StateRootSyncAuxToOrigin
 */
class StateRootSyncAuxToOrigin extends StateRootSyncCronBase {
  /**
   * Constructor for inserting state root sync from aux chain to origin chain entry in cron processes table.
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

    oThis.cronKind = cronProcessesConstants.auxToOriginStateRootSync;
  }
}

module.exports = StateRootSyncAuxToOrigin;
