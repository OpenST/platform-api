'use strict';
/**
 * Class for workflow topics being used in RabbitMQ.
 *
 * @module lib/globalConstant/workflowTopic
 */

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants');

/**
 * Class for workflow topics being used in RabbitMQ.
 *
 * @class
 */
class WorkflowTopicConstant {
  /**
   * Constructor for workflow topics being used in RabbitMQ.
   *
   * @constructor
   */
  constructor() {}

  get test() {
    return 'workflow.test';
  }

  get economySetup() {
    return 'workflow.economySetup';
  }

  get stateRootSync() {
    return 'workflow.stateRootSync';
  }

  get stPrimeStakeAndMint() {
    return 'workflow.stPrimeStakeAndMint';
  }

  get btStakeAndMint() {
    return 'workflow.btStakeAndMint';
  }

  get grantEthOst() {
    return 'workflow.grantEthOst';
  }

  get userSetup() {
    return 'auxWorkflow.userSetup';
  }

  get authorizeDevice() {
    return 'auxWorkflow.authorizeDevice';
  }

  get revokeDevice() {
    return 'auxWorkflow.revokeDevice';
  }

  get authorizeSession() {
    return 'auxWorkflow.authorizeSession';
  }

  get revokeSession() {
    return 'auxWorkflow.revokeSession';
  }

  get logoutSession() {
    return 'auxWorkflow.logoutSession';
  }

  get initiateRecovery() {
    return 'auxWorkflow.initiateRecovery';
  }

  get abortRecoveryByOwner() {
    return 'auxWorkflow.abortRecoveryByOwner';
  }

  get resetRecoveryOwner() {
    return 'auxWorkflow.resetRecoveryOwner';
  }

  get executeRecovery() {
    return 'auxWorkflow.executeRecovery';
  }

  get abortRecoveryByRecoveryController() {
    return 'auxWorkflow.abortRecoveryByRecoveryController';
  }

  get stPrimeRedeemAndUnstake() {
    return 'workflow.stPrimeRedeemAndUnstake';
  }

  get btRedeemAndUnstake() {
    return 'workflow.btRedeemAndUnstake';
  }

  get updatePricePoint() {
    return 'auxWorkflow.updatePricePoint';
  }
}

module.exports = new WorkflowTopicConstant();
