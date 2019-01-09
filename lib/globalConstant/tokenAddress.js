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
}

module.exports = new workflowStepConstants();
