'use strict';
/**
 *
 * @module lib/globalConstant/contract
 */
const rootPrefix = '../..';

/**
 * @class
 */
class Contract {
  /**
   * @constructor
   */
  constructor() {}

  // GAS RELATED CONSTANTS START //

  get setupOrganizationGas() {
    return 1600000;
  }

  // GAS RELATED CONSTANTS END //

  // GAS PRICE RELATED CONSTANTS START //

  get zeroGasPrice() {
    return '0x0';
  }

  get defaultOriginChainGasPrice() {
    return '0xBA43B7400';
  }

  get auxChainGasPrice() {
    return '0x3B9ACA00';
  }

  // GAS RELATED CONSTANTS END //

  // miscellaneous CONSTANTS START //

  get zeroValue() {
    return '0x0';
  }

  // miscellaneous CONSTANTS END //

  get organizationExpirationHeight() {
    return 10000000;
  }
}

module.exports = new Contract();
