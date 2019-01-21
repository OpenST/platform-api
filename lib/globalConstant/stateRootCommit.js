'use strict';
/**
 * Constants for state root commit progress statuses.
 *
 * @module lib/globalConstant/stateRootCommit
 */

/**
 * Class for state root commit progress statuses.
 *
 * @class
 */
class StateRootCommitStatus {
  /**
   * Constructor for state root commit progress statuses.
   *
   * @constructor
   */
  constructor() {}

  get commitInProgress() {
    return 'commit_in_progress';
  }

  get committed() {
    return 'committed';
  }

  get failed() {
    return 'failed';
  }
}

module.exports = new StateRootCommitStatus();
