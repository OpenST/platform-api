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

  get token() {
    return 'token';
  }

  get chain() {
    return 'chain';
  }

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

  get sessions() {
    return 'sessions';
  }

  get deviceManager() {
    return 'device_manager';
  }

  get nextPagePayload() {
    return 'next_page_payload';
  }

  get pricePoints() {
    return 'price_points';
  }
}

module.exports = new ResultType();
