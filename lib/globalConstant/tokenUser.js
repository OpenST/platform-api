'use strict';
/**
 * Token User constants
 *
 * @module lib/globalConstant/tokenUser
 */
const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

// Declare constants.

const tokenUser = {
  // Entity kind enum types start
  userKind: 'user',
  companyKind: 'company',
  // Entity kind enum types end

  // Statuses enum types start
  createdStatus: 'created',
  activatingStatus: 'activating',
  activatedStatus: 'activated'
  // Statuses enum types end
};

tokenUser.kinds = {
  '1': tokenUser.userKind,
  '2': tokenUser.companyKind
};

tokenUser.invertedKinds = util.invert(tokenUser.kinds);

tokenUser.statuses = {
  '1': tokenUser.createdStatus,
  '2': tokenUser.activatingStatus,
  '3': tokenUser.activatedStatus
};

tokenUser.invertedStatuses = util.invert(tokenUser.statuses);

module.exports = tokenUser;
