'use strict';

/**
 * token address constants
 *
 * @module lib/globalConstant/tokenAddress
 */

class workflowStepConstants {
  constructor() {}

  get ownerAddressKind() {
    return 'owner';
  }

  get adminAddressKind() {
    return 'admin';
  }

  get workerAddressKind() {
    return 'worker';
  }

  get uniqueKinds() {
    const oThis = this;
    return [oThis.ownerAddressKind, oThis.adminAddressKind];
  }

  // contract kinds

  get originOrganizationContract() {
    return 'originOrganizationContract';
  }
  get auxOrganizationContract() {
    return 'auxOrganizationContract';
  }
}

module.exports = new workflowStepConstants();
