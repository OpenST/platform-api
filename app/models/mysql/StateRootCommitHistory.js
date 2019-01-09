'use strict';

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  stateRootCommitHistoryConstants = require(rootPrefix + '/lib/globalConstant/stateRootCommitHistory'),
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

    oThis.tableName = 'state_root_commit_history';
  }

  /**
   * insertStateRootCommit - inserts entry in state root commit history
   *
   * @param params
   * @return {*|void}
   */
  insertStateRootCommit(params) {
    const oThis = this;

    return oThis.insert(params).fire();
  }

  /**
   * updateStatus - updates status in state root commit history
   * @param params
   * @return {*|void}
   */
  updateStatus(params) {
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
