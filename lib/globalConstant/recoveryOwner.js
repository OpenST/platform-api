'use strict';
/**
 * Recovery owners model ddb constants.
 *
 * @module lib/globalConstant/recoveryOwner
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

let recoveryOwnerStatuses, invertedRecoveryOwnerStatuses;

class RecoveryOwner {
  constructor() {}

  get authorizationFailedStatus() {
    return 'AUTHORIZATION_FAILED';
  }

  get authorizingStatus() {
    return 'AUTHORIZING';
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
   * Recovery owner statuses
   *
   * @return {*}
   */
  get recoveryOwnerStatuses() {
    const oThis = this;

    if (recoveryOwnerStatuses) {
      return recoveryOwnerStatuses;
    }

    recoveryOwnerStatuses = {
      '1': oThis.authorizationFailedStatus,
      '2': oThis.authorizingStatus,
      '3': oThis.authorizedStatus,
      '4': oThis.revokingStatus,
      '5': oThis.revokedStatus
    };

    return recoveryOwnerStatuses;
  }

  /**
   * Inverted statuses
   *
   * @return {*}
   */
  get invertedRecoveryOwnerStatuses() {
    const oThis = this;

    if (invertedRecoveryOwnerStatuses) {
      return invertedRecoveryOwnerStatuses;
    }

    return util.invert(oThis.recoveryOwnerStatuses);
  }
}

module.exports = new RecoveryOwner();
