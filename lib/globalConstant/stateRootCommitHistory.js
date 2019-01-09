'use strict';

class StateRootCommitHistoryStatus {
  constructor() {}

  get commitInProgress() {
    return 'commit_in_progress';
  }

  get commited() {
    return 'commited';
  }

  get failed() {
    return 'failed';
  }
}

module.exports = new StateRootCommitHistoryStatus();
