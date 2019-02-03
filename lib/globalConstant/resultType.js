'use strict';
/**
 * Global constants for result types
 *
 * @module lib/globalConstant/resultType
 */

/**
 *
 * @class
 */
class ResultType {
  /**
   * Constructor
   *
   * @constructor
   */
  constructor() {}

  get user() {
    return 'user';
  }

  get users() {
    return 'users';
  }

  get device() {
    return 'device';
  }

  get devices() {
    return 'devices';
  }

  get deviceManager() {
    return 'device_manager';
  }
}

module.exports = new ResultType();
