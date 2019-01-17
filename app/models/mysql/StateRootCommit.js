'use strict';

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  stateRootCommitHistoryConstants = require(rootPrefix + '/lib/globalConstant/stateRootCommit'),
  util = require(rootPrefix + '/lib/util');

const dbName = 'saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

const statuses = {
    '1': stateRootCommitHistoryConstants.commitInProgress,
    '2': stateRootCommitHistoryConstants.commited,
    '3': stateRootCommitHistoryConstants.failed
  },
  invertedStatuses = util.invert(statuses);

class StateRootCommitHistory extends ModelBase {
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'state_root_commits';
  }

  /**
   * statuses
   * @return {{}}
   */
  get statuses() {
    return statuses;
  }

  /**
   * invertedStatuses
   *
   * @return {Object|*}
   */
  get invertedStatuses() {
    return invertedStatuses;
  }

  /**
   * getLastSyncedBlock
   *
   * @param params
   * @return {Promise<*>}
   */
  getLastSyncedBlock(params) {
    const oThis = this;

    return oThis
      .select('block_number')
      .where(['source_chain_id = ? AND target_chain_id = ?', params.source_chain_id, params.target_chain_id])
      .order_by('created_at desc')
      .limit(1)
      .fire();
  }

  /**
   * insertStateRootCommit - inserts entry in state root commit history
   *
   * @param params
   * @return {*|void}
   */
  async insertStateRootCommit(params) {
    const oThis = this;

    return oThis.insert(params).fire();
  }

  /**
   * updateStatus - updates status in state root commit history
   * @param params
   * @return {*|void}
   */
  async updateStatus(params) {
    const oThis = this;

    return oThis
      .update({ status: invertedStatuses[params.status] })
      .where({
        source_chain_id: params.source_chain_id,
        target_chain_id: params.target_chain_id,
        block_number: params.block_number
      })
      .fire();
  }
}

module.exports = StateRootCommitHistory;
