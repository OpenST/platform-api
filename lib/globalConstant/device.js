'use strict';
/**
 * Device model ddb constants.
 *
 * @module lib/globalConstant/device
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

// Declare constants.
const status = {
  // Status kind enum types start
  registeredStatus: 'REGISTERED',
  authorisingStatus: 'AUTHORIZING',
  authorisedStatus: 'AUTHORIZED',
  revokingStatus: 'REVOKING',
  revokedStatus: 'REVOKED'
};

status.kinds = {
  '1': status.registeredStatus,
  '2': status.authorisingStatus,
  '3': status.authorisedStatus,
  '4': status.revokingStatus,
  '5': status.revokedStatus
};

status.invertedKinds = util.invert(status.kinds);

module.exports = status;
