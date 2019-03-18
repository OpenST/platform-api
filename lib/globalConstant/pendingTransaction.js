'use strict';
/**
 *
 * @module lib/globalConstant/pendingTransaction
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

// Declare constants.
const pendingTransaction = {
  // Status kind enum types start
  createdStatus: 'CREATED',
  submittedStatus: 'SUBMITTED',
  minedStatus: 'MINED',
  successStatus: 'SUCCESS',
  failedStatus: 'FAILED',

  // Kinds enum types start
  fundAuxFunderAddressKind: 'fundAuxFunderAddress',
  fundExTxWorkerKind: 'fundExTxWorker',
  fundAuxAdminAddressKind: 'fundAuxAdminAddress',
  fundAuxWorkerAddressKind: 'fundAuxWorkerAddress',
  fundTokenUserOpsWorkerKind: 'fundTokenUserOpsWorker',
  deployTokenOrganizationKind: 'deployTokenOrganization',
  deployBrandedTokenKind: 'deployBrandedToken',
  deployUtilityBrandedTokenKind: 'deployUtilityBrandedToken',
  deployTokenGatewayKind: 'deployTokenGateway',
  deployTokenCoGatewayKind: 'deployTokenCoGateway',
  activateTokenGatewayKind: 'activateTokenGateway',
  setCoGatewayInUbtKind: 'setCoGatewayInUbt',
  setGatewayInBtKind: 'setGatewayInBt',
  deployGatewayComposerKind: 'deployGatewayComposer',
  setInternalActorForOwnerInUBTKind: 'setInternalActorForOwnerInUBT',
  deployTokenRuleKind: 'deployTokenRule',
  deployTokenHolderMasterCopyKind: 'deployTokenHolderMasterCopy',
  deployUserWalletFactoryKind: 'deployUserWalletFactory',
  deployGnosisSafeMultiSigMasterCopyKind: 'deployGnosisSafeMultiSigMasterCopy',
  deployDelayedRecoveryModuleMasterCopyKind: 'deployDelayedRecoveryModuleMasterCopy',
  deployCreateAndAddModulesKind: 'deployCreateAndAddModules',
  fundRecoveryControllerAddressKind: 'fundRecoveryControllerAddress',
  deployPricerRuleKind: 'deployPricerRule',
  registerPricerRuleKind: 'registerPricerRule',
  addPriceOracleInPricerRuleKind: 'addPriceOracleInPricerRule',
  setAcceptedMarginInPricerRuleKind: 'setAcceptedMarginInPricerRule',
  deployProxyFactoryKind: 'deployProxyFactory',
  setInternalActorForTRInUBTKind: 'setInternalActorForTRInUBT',
  createCompanyWalletKind: 'createCompanyWallet',
  setInternalActorForCompanyTHInUBTKind: 'setInternalActorForCompanyTHInUBT',
  approveGatewayComposerKind: 'approveGatewayComposer',
  requestStakeKind: 'requestStake',
  acceptStakeKind: 'acceptStake',
  commitStateRootKind: 'commitStateRoot',
  proveGatewayOnCoGatewayKind: 'proveGatewayOnCoGateway',
  confirmStakeIntentKind: 'confirmStakeIntent',
  progressStakeKind: 'progressStake',
  progressMintKind: 'progressMint',
  stPrimeApproveKind: 'stPrimeApprove',
  simpleTokenStakeKind: 'simpleTokenStake',
  addUserInWalletFactoryKind: 'addUserInWalletFactory',
  setInternalActorForUserTHInUBTKind: 'setInternalActorForUserTHInUBT',
  grantEthKind: 'grantEth',
  grantOstKind: 'grantOst',
  authorizeDeviceKind: 'authorizeDevice',
  authorizeSessionKind: 'authorizeSession',
  revokeDeviceKind: 'revokeDevice',
  revokeSessionKind: 'revokeSession',
  logoutSessionsKind: 'logoutSessions',
  initiateRecoveryKind: 'initiateRecovery',
  abortRecoveryByOwnerKind: 'abortRecoveryByOwner',
  abortRecoveryByRecoveryControllerKind: 'abortRecoveryByRecoveryController',
  resetRecoveryOwnerKind: 'resetRecoveryOwner',
  executeRecoveryKind: 'executeRecovery',
  executeRuleKind: 'executeRule',
  fundOstPrimeKind: 'fundOstPrime'
};

pendingTransaction.statuses = {
  '1': pendingTransaction.createdStatus,
  '2': pendingTransaction.submittedStatus,
  '3': pendingTransaction.minedStatus,
  '4': pendingTransaction.successStatus,
  '5': pendingTransaction.failedStatus
};

pendingTransaction.kinds = {
  '1': pendingTransaction.fundAuxFunderAddressKind,
  '2': pendingTransaction.fundExTxWorkerKind,
  '3': pendingTransaction.fundAuxAdminAddressKind,
  '4': pendingTransaction.fundAuxWorkerAddressKind,
  '5': pendingTransaction.fundTokenUserOpsWorkerKind,
  '6': pendingTransaction.deployTokenOrganizationKind,
  '7': pendingTransaction.deployBrandedTokenKind,
  '8': pendingTransaction.deployUtilityBrandedTokenKind,
  '9': pendingTransaction.deployTokenGatewayKind,
  '10': pendingTransaction.deployTokenCoGatewayKind,
  '11': pendingTransaction.activateTokenGatewayKind,
  '12': pendingTransaction.setCoGatewayInUbtKind,
  '13': pendingTransaction.setGatewayInBtKind,
  '14': pendingTransaction.deployGatewayComposerKind,
  '15': pendingTransaction.setInternalActorForOwnerInUBTKind,
  '16': pendingTransaction.deployTokenRuleKind,
  '17': pendingTransaction.deployTokenHolderMasterCopyKind,
  '18': pendingTransaction.deployUserWalletFactoryKind,
  '19': pendingTransaction.deployGnosisSafeMultiSigMasterCopyKind,
  '20': pendingTransaction.deployDelayedRecoveryModuleMasterCopyKind,
  '21': pendingTransaction.deployCreateAndAddModulesKind,
  '22': pendingTransaction.fundRecoveryControllerAddressKind,
  '23': pendingTransaction.deployPricerRuleKind,
  '24': pendingTransaction.registerPricerRuleKind,
  '25': pendingTransaction.addPriceOracleInPricerRuleKind,
  '26': pendingTransaction.setAcceptedMarginInPricerRuleKind,
  '27': pendingTransaction.deployProxyFactoryKind,
  '28': pendingTransaction.setInternalActorForTRInUBTKind,
  '29': pendingTransaction.createCompanyWalletKind,
  '30': pendingTransaction.setInternalActorForCompanyTHInUBTKind,

  // ST Prime stake and mint specific
  '31': pendingTransaction.stPrimeApproveKind,
  '32': pendingTransaction.simpleTokenStakeKind,

  // BT stake and mint specific
  '33': pendingTransaction.requestStakeKind,
  '34': pendingTransaction.acceptStakeKind,

  // Stake and mint steps common for STP & BT
  '35': pendingTransaction.approveGatewayComposerKind,
  '36': pendingTransaction.commitStateRootKind,
  '37': pendingTransaction.proveGatewayOnCoGatewayKind,
  '38': pendingTransaction.confirmStakeIntentKind,
  '39': pendingTransaction.progressStakeKind,
  '40': pendingTransaction.progressMintKind,

  // Activate User Steps
  '41': pendingTransaction.addUserInWalletFactoryKind,
  '42': pendingTransaction.setInternalActorForUserTHInUBTKind,

  // Grant
  '43': pendingTransaction.grantEthKind,
  '44': pendingTransaction.grantOstKind,

  // Multi sig operations
  '45': pendingTransaction.authorizeDeviceKind,
  '46': pendingTransaction.revokeDeviceKind,
  '47': pendingTransaction.authorizeSessionKind,
  '48': pendingTransaction.revokeSessionKind,

  // Recovery
  '49': pendingTransaction.initiateRecoveryKind,
  '50': pendingTransaction.abortRecoveryByOwnerKind,
  '51': pendingTransaction.abortRecoveryByRecoveryControllerKind,
  '52': pendingTransaction.resetRecoveryOwnerKind,
  '53': pendingTransaction.executeRecoveryKind,

  // Execute Rule
  '54': pendingTransaction.executeRuleKind,

  // Fund
  '55': pendingTransaction.fundOstPrimeKind,

  // Logout sessions
  '56': pendingTransaction.logoutSessionsKind
};

//If changed update in file dynamo_to_es_formatter as well.
pendingTransaction.invertedStatuses = util.invert(pendingTransaction.statuses);

pendingTransaction.invertedKinds = util.invert(pendingTransaction.kinds);

module.exports = pendingTransaction;
