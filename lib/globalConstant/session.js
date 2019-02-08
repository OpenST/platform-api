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
    return 'initializing';
  }

  get authorizedStatus() {
    return 'authorized';
  }

  get revokingStatus() {
    return 'revoking';
  }

  get revokedStatus() {
    return 'revoked';
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
}

module.exports = new Session();
