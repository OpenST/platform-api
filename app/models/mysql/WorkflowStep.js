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
    '6': workflowStepConstants.retriedStatus
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
    '45': workflowStepConstants.generateTxWorkerAddresses,

    '34': workflowStepConstants.deployTokenRules,
    '35': workflowStepConstants.saveTokenRules,
    '36': workflowStepConstants.deployTokenHolderMasterCopy,
    '37': workflowStepConstants.saveTokenHolderMasterCopy,
    '38': workflowStepConstants.deployUserWalletFactory,
    '39': workflowStepConstants.saveUserWalletFactory,
    '40': workflowStepConstants.deployGnosisSafeMultiSigMasterCopy,
    '41': workflowStepConstants.saveGnosisSafeMultiSigMasterCopy,

    '60': workflowStepConstants.stPrimeStakeAndMintInit,
    '61': workflowStepConstants.stPrimeApprove,
    '62': workflowStepConstants.simpleTokenStake,
    '63': workflowStepConstants.fetchStakeIntentMessageHash,
    '64': workflowStepConstants.proveGatewayOnCoGateway,
    '65': workflowStepConstants.confirmStakeIntent,
    '66': workflowStepConstants.progressStake,
    '67': workflowStepConstants.progressMint,

    '70': workflowStepConstants.btStakeAndMintInit,
    '71': workflowStepConstants.approveGatewayComposerTrx,
    '72': workflowStepConstants.recordRequestStakeTx,
    '73': workflowStepConstants.checkGatewayComposerAllowance,
    '74': workflowStepConstants.fetchStakeRequestHash,
    '75': workflowStepConstants.acceptStake,

    '80': workflowStepConstants.checkApproveStatus,
    '81': workflowStepConstants.checkStakeStatus,
    '82': workflowStepConstants.checkProveGatewayStatus,
    '83': workflowStepConstants.checkConfirmStakeStatus,
    '84': workflowStepConstants.checkProgressStakeStatus,
    '85': workflowStepConstants.checkProgressMintStatus,

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

    '171': workflowStepConstants.grantEthOstInit,
    '172': workflowStepConstants.grantEth,
    '173': workflowStepConstants.verifyGrantEth,
    '174': workflowStepConstants.grantOst,
    '175': workflowStepConstants.verifyGrantOst
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
