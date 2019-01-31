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
  registered: 'registered',
  authorising: 'authorising',
  authorised: 'authorised',
  revoking: 'revoking',
  revoked: 'revoked'
};

status.kinds = {
  '1': status.registered,
  '2': status.authorising,
  '3': status.authorised,
  '4': status.revoking,
  '5': status.revoked
};

status.invertedKinds = util.invert(status.kinds);

module.exports = status;
