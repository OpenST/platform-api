'use strict';

/**
 *
 * @module lib/globalConstant/kms
 */

const rootPrefix = '../..';

class Kms {
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
}

module.exports = new Kms();
