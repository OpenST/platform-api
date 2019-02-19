'use strict';
/**
 * Global constants for KMS purposes.
 *
 * @module lib/globalConstant/kms
 */

/**
 * Class for for KMS purposes.
 *
 * @class
 */
class Kms {
  /**
   * Constructor for for KMS purposes.
   *
   * @constructor
   */
  constructor() {}

  get configStrategyPurpose() {
    return 'configStrategy';
  }

  get managedAddressPurpose() {
    return 'managedAddress';
  }

  get clientValidationPurpose() {
    return 'clientValidation';
  }

  get userScryptSaltPurpose() {
    return 'userScryptSalt';
  }
}

module.exports = new Kms();
