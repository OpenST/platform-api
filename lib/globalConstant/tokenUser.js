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
  createdStatus: 'CREATED',
  activatingStatus: 'ACTIVATING',
  activatedStatus: 'ACTIVATED',
  // Statuses enum types end

  // Token Holder statuses enum types start
  tokenHolderActiveStatus: 'ACTIVE',
  tokenHolderLoggingOutStatus: 'LOGGING OUT',
  tokenHolderLoggedOutStatus: 'LOGGED OUT',
  // Token Holder Statuses enum types end

  saasApiActiveStatus: 'active',
  saasApiInactiveStatus: 'inactive'
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

tokenUser.tokenHolderStatuses = {
  '1': tokenUser.tokenHolderActiveStatus,
  '2': tokenUser.tokenHolderLoggingOutStatus,
  '3': tokenUser.tokenHolderLoggedOutStatus
};

tokenUser.invertedTokenHolderStatuses = util.invert(tokenUser.tokenHolderStatuses);

tokenUser.saasApiStatuses = {
  '1': tokenUser.saasApiActiveStatus,
  '2': tokenUser.saasApiInactiveStatus
};

tokenUser.invertedSaasApiStatuses = util.invert(tokenUser.saasApiStatuses);

module.exports = tokenUser;
