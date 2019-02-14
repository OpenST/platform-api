'use strict';
/**
 * Global constants for device manager's multisig operations.
 *
 * @module lib/globalConstant/multisigOperation
 */

/**
 * Class for for KWC purposes.
 *
 * @class
 */
class multisigOperation {
  /**
   * Constructor for for KMS purposes.
   *
   * @constructor
   */
  constructor() {}

  get authorizeDevice() {
    return 'authorize_device';
  }

  get revokeDevice() {
    return 'revoke_device';
  }

  get authorizeTokenHolderSession() {
    return 'authorize_token_holder_session';
  }

  get revokeTokenHolderSession() {
    return 'revoke_token_holder_session';
  }
}

module.exports = new multisigOperation();
