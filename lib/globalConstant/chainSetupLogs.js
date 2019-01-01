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
  deployBaseContractStepKind: 'deployBaseContract',
  setBaseContractAdminStepKind: 'setBaseContractAdmin',
  initializeBaseContractStepKind: 'initializeBaseContract',
  setupBaseContractOrganizationStepKind: 'setupBaseContractOrganization',
  setupAnchorOrganizationStepKind: 'setupAnchorOrganization',

  auxChainKind: 'aux',
  originChainKind: 'origin',

  successStatus: 'successStatus',
  failureStatus: 'failureStatus'
};

chainSetupLogs.stepKinds = {
  '1': chainSetupLogs.deployBaseContractStepKind,
  '2': chainSetupLogs.setBaseContractAdminStepKind,
  '3': chainSetupLogs.initializeBaseContractStepKind,
  '4': chainSetupLogs.setupBaseContractOrganizationStepKind,
  '5': chainSetupLogs.setupAnchorOrganizationStepKind
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
