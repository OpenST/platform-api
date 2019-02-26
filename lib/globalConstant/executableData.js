'use strict';
/**
 *
 * @module lib/globalConstant/executableData
 */

let validDataDefinations, supportedMethodsForTR, supportedMethodsForPR;

/**
 * Class for executableData constants.
 *
 * @class
 */
class ExecutableData {
  /**
   * Constructor for executableData.
   *
   * @constructor
   */
  constructor() {}

  get executeRuleDataDefination() {
    return 'EXECUTE_RULE';
  }

  get version() {
    return '1';
  }

  get validDataDefinations() {
    const oThis = this;
    if (validDataDefinations) {
      return validDataDefinations;
    }
    validDataDefinations = [oThis.executeRuleDataDefination];
    return validDataDefinations;
  }

  get zeroValue() {
    return '0';
  }

  get directTransferMethod() {
    return 'directTransfers';
  }

  get payMethod() {
    return 'pay';
  }

  get supportedMethodsForPricerRule() {
    const oThis = this;
    if (supportedMethodsForPR) {
      return supportedMethodsForPR;
    }
    supportedMethodsForPR = [oThis.payMethod];
    return supportedMethodsForPR;
  }

  get supportedMethodsForTokenRule() {
    const oThis = this;
    if (supportedMethodsForTR) {
      return supportedMethodsForTR;
    }
    supportedMethodsForTR = [oThis.directTransferMethod];
    return supportedMethodsForTR;
  }
}

module.exports = new ExecutableData();
