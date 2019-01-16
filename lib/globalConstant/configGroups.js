'use strict';
/**
 * Class for config group constants
 *
 * @module
 */

/**
 * Class for config group constants
 *
 * @class
 */
class configGroupsConstants {
  /**
   * Constructor for config group constants
   *
   * @constructor
   */
  constructor() {}

  get notAvailableForAllocation() {
    return 'notAvailable';
  }

  get availableForAllocation() {
    return 'available';
  }
}

module.exports = new configGroupsConstants();
