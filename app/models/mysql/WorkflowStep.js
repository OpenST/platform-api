'use strict';
/**
 * This is model for workflow_setup table.
 *
 * @module app/models/mysql/WorkflowStep
 */
const rootPrefix = '../../..',
  util = require(rootPrefix + '/lib/util'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

//NOTE: This is a shared table with KIT. Any changes here must be synced with model in KIT-API.

// Declare variables.
const dbName = 'kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment,
  statuses = {
    '1': workflowStepConstants.queuedStatus,
    '2': workflowStepConstants.pendingStatus,
    '3': workflowStepConstants.processedStatus,
    '4': workflowStepConstants.failedStatus,
    '5': workflowStepConstants.timeoutStatus,
    null: workflowStepConstants.retriedStatus
  },
  invertedStatuses = util.invert(statuses),
  kinds = {
    '1': workflowStepConstants.economySetupInit,
    '2': workflowStepConstants.generateTokenAddresses,
    '3': workflowStepConstants.fundAuxFunderAddress,
    '4': workflowStepConstants.verifyFundAuxFunderAddress,
    '5': workflowStepConstants.fundAuxAdminAddress,
    '6': workflowStepConstants.verifyFundAuxAdminAddress,
    '7': workflowStepConstants.fundAuxWorkerAddress,
    '8': workflowStepConstants.verifyFundAuxWorkerAddress,
    '9': workflowStepConstants.deployOriginTokenOrganization,
    '10': workflowStepConstants.saveOriginTokenOrganization,
    '11': workflowStepConstants.deployOriginBrandedToken,
    '12': workflowStepConstants.saveOriginBrandedToken,
    '13': workflowStepConstants.deployAuxTokenOrganization,
    '14': workflowStepConstants.saveAuxTokenOrganization,
    '15': workflowStepConstants.deployUtilityBrandedToken,
    '16': workflowStepConstants.saveUtilityBrandedToken,
    '17': workflowStepConstants.deployTokenGateway,
    '18': workflowStepConstants.saveTokenGateway,
    '19': workflowStepConstants.updateTokenInOstView,
    '20': workflowStepConstants.deployTokenCoGateway,
    '21': workflowStepConstants.saveTokenCoGateway,
    '22': workflowStepConstants.activateTokenGateway,
    '23': workflowStepConstants.verifyActivateTokenGateway,
    '24': workflowStepConstants.setGatewayInBt,
    '25': workflowStepConstants.verifySetGatewayInBt,
    '26': workflowStepConstants.setCoGatewayInUbt,
    '27': workflowStepConstants.verifySetCoGatewayInUbt,
    '28': workflowStepConstants.deployGatewayComposer,
    '29': workflowStepConstants.verifyDeployGatewayComposer,
    '30': workflowStepConstants.setInternalActorForOwnerInUBT,
    '31': workflowStepConstants.verifySetInternalActorForOwnerInUBT,
    '32': workflowStepConstants.verifyEconomySetup,
    '33': workflowStepConstants.assignShards,
    '86': workflowStepConstants.sendTokenSetupSuccessEmail,
    '87': workflowStepConstants.sendTokenSetupErrorEmail,

    '34': workflowStepConstants.deployTokenRules,
    '35': workflowStepConstants.saveTokenRules,
    '36': workflowStepConstants.deployTokenHolderMasterCopy,
    '37': workflowStepConstants.saveTokenHolderMasterCopy,
    '38': workflowStepConstants.deployUserWalletFactory,
    '39': workflowStepConstants.saveUserWalletFactory,
    '40': workflowStepConstants.deployGnosisSafeMultiSigMasterCopy,
    '41': workflowStepConstants.saveGnosisSafeMultiSigMasterCopy,
    '42': workflowStepConstants.deployPricerRule,
    '43': workflowStepConstants.savePricerRule,
    '44': workflowStepConstants.registerPricerRule,
    '45': workflowStepConstants.verifyRegisterPricerRule,
    '46': workflowStepConstants.addUsdPriceOracleInPricerRule,
    '47': workflowStepConstants.verifyAddUsdPriceOracleInPricerRule,
    '355': workflowStepConstants.addEurPriceOracleInPricerRule,
    '356': workflowStepConstants.verifyAddEurPriceOracleInPricerRule,
    '359': workflowStepConstants.addGbpPriceOracleInPricerRule,
    '360': workflowStepConstants.verifyAddGbpPriceOracleInPricerRule,
    '48': workflowStepConstants.setUsdAcceptedMarginInPricerRule,
    '49': workflowStepConstants.verifySetUsdAcceptedMarginInPricerRule,
    '357': workflowStepConstants.setEurAcceptedMarginInPricerRule,
    '358': workflowStepConstants.verifySetEurAcceptedMarginInPricerRule,
    '361': workflowStepConstants.setGbpAcceptedMarginInPricerRule,
    '362': workflowStepConstants.verifySetGbpAcceptedMarginInPricerRule,
    '59': workflowStepConstants.postTokenRuleDeploy,

    '52': workflowStepConstants.deployProxyFactory,
    '53': workflowStepConstants.saveProxyFactory,
    '54': workflowStepConstants.initializeCompanyTokenHolderInDb,
    '55': workflowStepConstants.createCompanyWallet,
    '56': workflowStepConstants.verifyCreateCompanyWallet,
    '57': workflowStepConstants.setInternalActorForCompanyTHInUBT,
    '58': workflowStepConstants.verifySetInternalActorForCompanyTHInUBT,

    '50': workflowStepConstants.generateTxWorkerAddresses,
    '51': workflowStepConstants.fundExTxWorkers,

    '60': workflowStepConstants.stPrimeStakeAndMintInit,
    '61': workflowStepConstants.stPrimeApprove,
    '62': workflowStepConstants.simpleTokenStake,
    '63': workflowStepConstants.fetchStakeIntentMessageHash,
    '64': workflowStepConstants.proveGatewayOnCoGateway,
    '65': workflowStepConstants.confirmStakeIntent,
    '66': workflowStepConstants.progressStake,
    '67': workflowStepConstants.progressMint,
    '88': workflowStepConstants.sendStakeAndMintSuccessEmail,
    '89': workflowStepConstants.sendStakeAndMintErrorEmail,

    '70': workflowStepConstants.btStakeAndMintInit,
    '71': workflowStepConstants.recordOrSubmitApproveGCTx,
    '72': workflowStepConstants.recordOrSubmitRequestStakeTx,
    '73': workflowStepConstants.checkGatewayComposerAllowance,
    '74': workflowStepConstants.fetchStakeRequestHash,
    '75': workflowStepConstants.acceptStake,

    '80': workflowStepConstants.checkApproveStatus,
    '81': workflowStepConstants.checkStakeStatus,
    '82': workflowStepConstants.checkProveGatewayStatus,
    '83': workflowStepConstants.checkConfirmStakeStatus,
    '84': workflowStepConstants.checkProgressStakeStatus,
    '85': workflowStepConstants.checkProgressMintStatus,

    '131': workflowStepConstants.deployDelayedRecoveryModuleMasterCopy,
    '132': workflowStepConstants.saveDelayedRecoveryModuleMasterCopy,
    '133': workflowStepConstants.deployCreateAndAddModules,
    '134': workflowStepConstants.saveCreateAndAddModules,
    '135': workflowStepConstants.fundRecoveryControllerAddress,
    '136': workflowStepConstants.setInternalActorForFacilitatorInUBT,
    '137': workflowStepConstants.verifySetInternalActorForFacilitatorInUBT,

    '101': workflowStepConstants.markSuccess,
    '102': workflowStepConstants.markFailure,

    '110': workflowStepConstants.testInit,
    '111': workflowStepConstants.s1,
    '112': workflowStepConstants.s2,
    '113': workflowStepConstants.s33,
    '114': workflowStepConstants.s4,
    '115': workflowStepConstants.s5,
    '116': workflowStepConstants.s6,
    '117': workflowStepConstants.s7,

    '150': workflowStepConstants.commitStateRootInit,
    '151': workflowStepConstants.commitStateRoot,
    '152': workflowStepConstants.updateCommittedStateRootInfo,

    '171': workflowStepConstants.grantEthStakeCurrencyInit,
    '172': workflowStepConstants.grantEth,
    '173': workflowStepConstants.verifyGrantEth,
    '174': workflowStepConstants.grantStakeCurrency,
    '175': workflowStepConstants.verifyGrantStakeCurrency,

    '181': workflowStepConstants.userSetupInit,
    '182': workflowStepConstants.addSessionAddresses,
    '183': workflowStepConstants.addUserInWalletFactory,
    '184': workflowStepConstants.fetchRegisteredUserEvent,
    '185': workflowStepConstants.setInternalActorForTokenHolderInUBT,
    '186': workflowStepConstants.verifyInternalActorTransactionInUBT,
    '187': workflowStepConstants.activateUser,
    '188': workflowStepConstants.rollbackUserSetup,

    '189': workflowStepConstants.fundTokenUserOpsWorker,
    '190': workflowStepConstants.verifyFundTokenUserOpsWorker,
    '191': workflowStepConstants.setInternalActorForTRInUBT,
    '192': workflowStepConstants.verifySetInternalActorForTRInUBT,

    '200': workflowStepConstants.authorizeDeviceInit,
    '201': workflowStepConstants.authorizeDevicePerformTransaction,
    '202': workflowStepConstants.authorizeDeviceVerifyTransaction,
    '203': workflowStepConstants.rollbackAuthorizeDeviceTransaction,

    '206': workflowStepConstants.authorizeSessionInit,
    '207': workflowStepConstants.authorizeSessionPerformTransaction,
    '208': workflowStepConstants.authorizeSessionVerifyTransaction,
    '209': workflowStepConstants.rollbackAuthorizeSessionTransaction,

    '212': workflowStepConstants.revokeDeviceInit,
    '213': workflowStepConstants.revokeDevicePerformTransaction,
    '214': workflowStepConstants.revokeDeviceVerifyTransaction,
    '215': workflowStepConstants.rollbackRevokeDeviceTransaction,

    '218': workflowStepConstants.revokeSessionInit,
    '219': workflowStepConstants.revokeSessionPerformTransaction,
    '220': workflowStepConstants.revokeSessionVerifyTransaction,
    '221': workflowStepConstants.rollbackRevokeSessionTransaction,

    '222': workflowStepConstants.logoutSessionInit,
    '223': workflowStepConstants.logoutSessionPerformTransaction,
    '224': workflowStepConstants.logoutSessionVerifyTransaction,

    '300': workflowStepConstants.initiateRecoveryInit,
    '301': workflowStepConstants.initiateRecoveryPerformTransaction,
    '302': workflowStepConstants.initiateRecoveryVerifyTransaction,

    '303': workflowStepConstants.abortRecoveryByOwnerInit,
    '304': workflowStepConstants.abortRecoveryByOwnerPerformTransaction,
    '305': workflowStepConstants.abortRecoveryByOwnerVerifyTransaction,

    '306': workflowStepConstants.resetRecoveryOwnerInit,
    '307': workflowStepConstants.resetRecoveryOwnerPerformTransaction,
    '308': workflowStepConstants.resetRecoveryOwnerVerifyTransaction,

    '309': workflowStepConstants.executeRecoveryInit,
    '310': workflowStepConstants.executeRecoveryPerformTransaction,
    '311': workflowStepConstants.executeRecoveryVerifyTransaction,

    '312': workflowStepConstants.abortRecoveryByRecoveryControllerInit,
    '313': workflowStepConstants.abortRecoveryByRecoveryControllerPerformTransaction,
    '314': workflowStepConstants.abortRecoveryByRecoveryControllerVerifyTransaction,

    '321': workflowStepConstants.stPrimeRedeemAndUnstakeInit,
    '322': workflowStepConstants.stPrimeWrapAsBT,
    '323': workflowStepConstants.stPrimeApproveCoGateway,
    '324': workflowStepConstants.stPrimeRedeem,
    '325': workflowStepConstants.fetchRedeemIntentMessageHash,
    '326': workflowStepConstants.proveCoGatewayOnGateway,
    '327': workflowStepConstants.confirmRedeemIntent,
    '328': workflowStepConstants.progressRedeem,
    '329': workflowStepConstants.progressUnstake,

    '331': workflowStepConstants.btRedeemAndUnstakeInit,
    '332': workflowStepConstants.executeBTRedemption,
    '333': workflowStepConstants.checkExecuteBTRedemptionStatus,

    '341': workflowStepConstants.checkWrapStPrimeStatus,
    '342': workflowStepConstants.checkApproveCoGatewayStatus,
    '343': workflowStepConstants.checkRedeemStatus,
    '344': workflowStepConstants.checkProveCoGatewayStatus,
    '345': workflowStepConstants.checkConfirmRedeemStatus,
    '346': workflowStepConstants.checkProgressRedeemStatus,
    '347': workflowStepConstants.checkProgressUnstakeStatus,

    '351': workflowStepConstants.updatePricePointInit,
    '352': workflowStepConstants.fetchPricePointFromCoinMarketCapApi,
    '353': workflowStepConstants.setPriceInPriceOracleContract,
    '354': workflowStepConstants.verifySetPriceInPriceOracleContract,
    '363': workflowStepConstants.updatePricePointsInBlockScanner
    // Till 362 used
  },
  invertedKinds = util.invert(kinds);

/**
 * Class for workflow step model
 *
 * @class
 */
class WorkflowStep extends ModelBase {
  /**
   * Constructor for workflow step model
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'workflow_steps';
  }

  get statuses() {
    return statuses;
  }

  get invertedStatuses() {
    invertedStatuses[workflowStepConstants.retriedStatus] = null;
    return invertedStatuses;
  }

  get kinds() {
    return kinds;
  }

  get invertedKinds() {
    return invertedKinds;
  }

  /**
   * This function will mark the step as success
   *
   * @param {Number/String} id
   * @param {Object} updateData
   *
   * @returns Promise<>
   */
  async updateRecord(id, updateData) {
    const oThis = this;

    return oThis
      .update(updateData)
      .where({ id: id })
      .fire();
  }

  /**
   * This function will mark the step as success
   *
   * @param id
   */
  async markAsSuccess(id) {
    const oThis = this;

    return oThis
      .update({ status: invertedStatuses[workflowStepConstants.processedStatus] })
      .where({ id: id })
      .fire();
  }
  /**
   * This function will mark the step as queued
   *
   * @param id
   */
  markAsQueued(id) {
    const oThis = this;

    return oThis
      .update({ status: invertedStatuses[workflowStepConstants.queuedStatus] })
      .where({ id: id })
      .fire();
  }

  markAsFailed(id) {
    const oThis = this;

    return oThis
      .update({ status: invertedStatuses[workflowStepConstants.failedStatus] })
      .where({ id: id })
      .fire();
  }

  markAsPending(id) {
    const oThis = this;

    return oThis
      .update({ status: invertedStatuses[workflowStepConstants.pendingStatus] })
      .where({ id: id })
      .fire();
  }
}

module.exports = WorkflowStep;
