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

  get session() {
    return 'session';
  }

  get deviceManager() {
    return 'device_manager';
  }

  get salt() {
    return 'salt';
  }

  get pricePoint() {
    return 'price_point';
  }

  get transaction() {
    return 'transaction';
  }

  get transactions() {
    return 'transactions';
  }

  get rules() {
    return 'rules';
  }

  get meta() {
    return 'meta';
  }
}

module.exports = new ResultType();
