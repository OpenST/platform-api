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

  get devices() {
    return 'devices';
  }

  get deviceManager() {
    return 'deviceManager';
  }
}

module.exports = new ResultType();
