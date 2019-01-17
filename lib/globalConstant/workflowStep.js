'use strict';
/**
 * Workflow step constants
 *
 * @module lib/globalConstant/workflowStep
 */

/**
 * Class for Workflow step constants
 *
 * @class
 */
class WorkflowStepConstants {
  /**
   * Constructor for Workflow step constants
   *
   * @constructor
   */
  constructor() {}

  // The process/task status, whether completed or inProgress
  get taskReadyToStart() {
    return 'taskReadyToStart';
  }
  get taskDone() {
    return 'taskDone';
  }
  // The process/task status end.

  //Generic constants start

  get queuedStatus() {
    return 'queued';
  }

  get pendingStatus() {
    return 'pending';
  }

  get processedStatus() {
    return 'processed';
  }

  get failedStatus() {
    return 'failed';
  }

  get timeoutStatus() {
    return 'timeOut';
  }

  get retriedStatus() {
    return null;
  }

  //Generic constants end

  // Onboarding/economySetup Steps Start

  get economySetupInit() {
    return 'economySetupInit';
  }
  get generateTokenAddresses() {
    return 'generateTokenAddresses';
  }
  get deployOriginTokenOrganization() {
    return 'deployOriginTokenOrganization';
  }
  get saveOriginTokenOrganization() {
    return 'saveOriginTokenOrganization';
  }
  get deployAuxTokenOrganization() {
    return 'deployAuxTokenOrganization';
  }
  get saveAuxTokenOrganization() {
    return 'saveAuxTokenOrganization';
  }
  get deployOriginBrandedToken() {
    return 'deployOriginBrandedToken';
  }
  get saveOriginBrandedToken() {
    return 'saveOriginBrandedToken';
  }
  get deployUtilityBrandedToken() {
    return 'deployUtilityBrandedToken';
  }
  get saveUtilityBrandedToken() {
    return 'saveUtilityBrandedToken';
  }
  get tokenDeployGateway() {
    return 'tokenDeployGateway';
  }
  get saveTokenGateway() {
    return 'saveTokenGateway';
  }
  get tokenDeployCoGateway() {
    return 'tokenDeployCoGateway';
  }
  get saveTokenCoGateway() {
    return 'saveTokenCoGateway';
  }
  get updateTokenInOstView() {
    return 'updateTokenInOstView';
  }
  get activateTokenGateway() {
    return 'activateTokenGateway';
  }
  get verifyActivateTokenGateway() {
    return 'verifyActivateTokenGateway';
  }
  get setCoGatewayInUbt() {
    return 'setCoGatewayInUbt';
  }
  get verifySetCoGatewayInUbt() {
    return 'verifySetCoGatewayInUbt';
  }
  get setGatewayInBt() {
    return 'setGatewayInBt';
  }
  get verifySetGatewayInBt() {
    return 'verifySetGatewayInBt';
  }

  // Onboarding/economySetup Steps end

  // stake & mint Steps Start

  // stake & mint Steps end

  // State root sync steps start
  get commitStateRootInit() {
    return 'commitStateRootInit';
  }
  get commitStateRoot() {
    return 'commitStateRoot';
  }
  get updateCommittedStateRootInfo() {
    return 'updateCommittedStateRootInfo';
  }
  // State root sync steps end

  // Common Steps Start

  get markSuccess() {
    return 'markSuccess';
  }

  get markFailure() {
    return 'markFailure';
  }
  // Common Steps End

  // Test Steps Start
  get testInit() {
    return 'testInit';
  }
  get s1() {
    return 's1';
  }
  get s2() {
    return 's2';
  }
  get s33() {
    return 's33';
  }
  get s4() {
    return 's4';
  }
  get s5() {
    return 's5';
  }
  get s6() {
    return 's6';
  }
  get s7() {
    return 's7';
  }
  // Test Steps End
}

module.exports = new WorkflowStepConstants();
