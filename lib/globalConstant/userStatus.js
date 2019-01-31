'use strict';
/**
 * User status constants
 *
 * @module lib/globalConstant/userStatus.js
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

// Declare constants.
const userStatus = {
  // Entity kind enum types start
  created: 'created',
  activating: 'activating',
  activated: 'activated'
};

userStatus.statuses = {
  '1': userStatus.created,
  '2': userStatus.activating,
  '3': userStatus.activated
};

userStatus.invertedStatuses = util.invert(userStatus.statuses);

module.exports = userStatus;
