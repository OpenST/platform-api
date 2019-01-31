'use strict';
/**
 * Shards model ddb constants.
 *
 * @module lib/globalConstant/device.js
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

// Declare constants.
const status = {
  // Status kind enum types start
  initializing: 'initializing',
  authorised: 'authorised',
  expired: 'expired',
  revoking: 'revoking',
  revoked: 'revoked'
};

status.kinds = {
  '1': status.initializing,
  '2': status.authorised,
  '3': status.expired,
  '4': status.revoking,
  '5': status.revoked
};

status.invertedKinds = util.invert(status.kinds);

module.exports = status;
