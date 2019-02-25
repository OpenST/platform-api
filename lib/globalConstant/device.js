'use strict';
/**
 * Device model ddb constants.
 *
 * @module lib/globalConstant/device
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

// Declare constants.
const deviceStatus = {
  // Status kind enum types start
  registeredStatus: 'REGISTERED',
  authorisingStatus: 'AUTHORIZING',
  authorisedStatus: 'AUTHORIZED',
  revokingStatus: 'REVOKING',
  revokedStatus: 'REVOKED',
  recoveringStatus: 'RECOVERING'
};

// Status failure types.
// NOTE: These types are not to be inserted into enum.

deviceStatus.failedStatusKinds = {
  authorisingFailedStatus: 'AUTHORISING_FAILED',
  authorisedFailedStatus: 'AUTHORIZED_FAILED',
  revokingFailedStatus: 'REVOKING_FAILED',
  revokedFailedStatus: 'REVOKED_FAILED'
};

deviceStatus.statuses = {
  '1': deviceStatus.registeredStatus,
  '2': deviceStatus.authorisingStatus,
  '3': deviceStatus.authorisedStatus,
  '4': deviceStatus.revokingStatus,
  '5': deviceStatus.revokedStatus,
  '6': deviceStatus.recoveringStatus
};

deviceStatus.invertedStatuses = util.invert(deviceStatus.statuses);

module.exports = deviceStatus;
