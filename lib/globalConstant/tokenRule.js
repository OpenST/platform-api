'use strict';
/**
 * Token rules constants
 *
 * @module lib/globalConstant/tokenRule
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

const tokenRule = {
  createdStatus: 'CREATED',
  registeringStatus: 'REGISTERING',
  registeredStatus: 'REGISTERED',
  revokingStatus: 'REVOKING',
  revokedStatus: 'REVOKED'
};

tokenRule.status = {
  '1': tokenRule.createdStatus,
  '2': tokenRule.registeringStatus,
  '3': tokenRule.registeredStatus,
  '4': tokenRule.revokingStatus,
  '5': tokenRule.revokedStatus
};

tokenRule.invertedStatus = util.invert(tokenRule.status);

module.exports = tokenRule;
