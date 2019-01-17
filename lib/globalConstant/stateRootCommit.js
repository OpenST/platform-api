'use strict';

class StateRootCommitStatus {
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

module.exports = new StateRootCommitStatus();
