'use strict';

/**
 * chain setup logs constants
 *
 * @module lib/globalConstant/chainSetupLogs
 */
const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

// Declare constants.

const chainSetupLogs = {
  deploySimpleToken: 'deploySimpleToken',
  setSimpleTokenAdmin: 'setSimpleTokenAdmin',
  finalizeSimpleToken: 'finalizeSimpleToken',

  auxChainKind: 'aux',
  originChainKind: 'origin',

  successStatus: 'successStatus',
  failureStatus: 'failureStatus'
};

chainSetupLogs.stepKinds = {
  '1': chainSetupLogs.deploySimpleToken,
  '2': chainSetupLogs.setSimpleTokenAdmin,
  '3': chainSetupLogs.finalizeSimpleToken
};

chainSetupLogs.chainKinds = {
  '1': chainSetupLogs.auxChainKind,
  '2': chainSetupLogs.originChainKind
};

chainSetupLogs.status = {
  '1': chainSetupLogs.successStatus,
  '2': chainSetupLogs.failureStatus
};

chainSetupLogs.invertedStepKinds = util.invert(chainSetupLogs.stepKinds);
chainSetupLogs.invertedChainKinds = util.invert(chainSetupLogs.chainKinds);
chainSetupLogs.invertedStatus = util.invert(chainSetupLogs.status);

module.exports = chainSetupLogs;
