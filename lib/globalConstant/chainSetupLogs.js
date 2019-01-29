'use strict';

/**
 * chain setup logs constants
 *
 * @module lib/globalConstant/chainSetupLogs
 */
const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

// Declare constants.

const chainSetupLogs = {
  deployBaseContractStepKind: 'deployBaseContract',
  setBaseContractAdminStepKind: 'setBaseContractAdmin',
  initializeBaseContractStepKind: 'initializeBaseContract',
  setupBaseContractOrganizationStepKind: 'setupBaseContractOrganization',
  setupAnchorOrganizationStepKind: 'setupAnchorOrganization',
  deployAnchorStepKind: 'deployAnchor',
  setCoAnchorStepKind: 'setCoAnchor',
  deployMerklePatriciaProofLibStepKind: 'deployMerklePatriciaProofLib',
  deployMessageBusLibStepKind: 'deployMessageBusLib',
  deployGatewayLibStepKind: 'deployGatewayLib',
  deployGatewayStepKind: 'deployGateway',
  deployCoGatewayStepKind: 'deployCoGateway',
  activateGatewayStepKind: 'activateGateway',

  successStatus: 'successStatus',
  failureStatus: 'failureStatus'
};

chainSetupLogs.stepKinds = {
  '1': chainSetupLogs.deployBaseContractStepKind,
  '2': chainSetupLogs.setBaseContractAdminStepKind,
  '3': chainSetupLogs.initializeBaseContractStepKind,
  '4': chainSetupLogs.setupBaseContractOrganizationStepKind,
  '5': chainSetupLogs.setupAnchorOrganizationStepKind,
  '6': chainSetupLogs.deployAnchorStepKind,
  '7': chainSetupLogs.setCoAnchorStepKind,
  '8': chainSetupLogs.deployMerklePatriciaProofLibStepKind,
  '9': chainSetupLogs.deployMessageBusLibStepKind,
  '10': chainSetupLogs.deployGatewayLibStepKind,
  '11': chainSetupLogs.deployGatewayStepKind,
  '12': chainSetupLogs.deployCoGatewayStepKind,
  '13': chainSetupLogs.activateGatewayStepKind
};

chainSetupLogs.chainKinds = {
  '1': coreConstants.originChainKind,
  '2': coreConstants.auxChainKind
};

chainSetupLogs.status = {
  '1': chainSetupLogs.successStatus,
  '2': chainSetupLogs.failureStatus
};

chainSetupLogs.invertedStepKinds = util.invert(chainSetupLogs.stepKinds);
chainSetupLogs.invertedChainKinds = util.invert(chainSetupLogs.chainKinds);
chainSetupLogs.invertedStatus = util.invert(chainSetupLogs.status);

module.exports = chainSetupLogs;
