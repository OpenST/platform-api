'use strict';
/**
 * Session model ddb constants.
 *
 * @module lib/globalConstant/session
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

let sessionStatuses, invertedSessionStatuses;

class Session {
  constructor() {}

  get initializingStatus() {
    return 'INITIALIZING';
  }

  get authorizedStatus() {
    return 'AUTHORIZED';
  }

  get revokingStatus() {
    return 'REVOKING';
  }

  get revokedStatus() {
    return 'REVOKED';
  }

  /**
   * Session statuses
   *
   * @return {*}
   */
  get sessionStatuses() {
    const oThis = this;

    if (sessionStatuses) {
      return sessionStatuses;
    }

    sessionStatuses = {
      '1': oThis.initializingStatus,
      '2': oThis.authorizedStatus,
      '3': oThis.revokingStatus,
      '4': oThis.revokedStatus
    };

    return sessionStatuses;
  }

  /**
   * Inverted statuses
   *
   * @return {*}
   */
  get invertedSessionStatuses() {
    const oThis = this;

    if (invertedSessionStatuses) {
      return invertedSessionStatuses;
    }

    return util.invert(oThis.sessionStatuses);
  }

  /**
   * Minimum time(in ms) after which session expires
   *
   * @return {number}
   */
  get sessionKeyExpirationMinimumTime() {
    return 2 * 60 * 60 * 1000;
  }
}

module.exports = new Session();
