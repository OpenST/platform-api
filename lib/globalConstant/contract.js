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

  get deployBTGas() {
    return 8000000;
  }

  get deployUBTGas() {
    return 8000000;
  }

  get deployGatewayGas() {
    return 8000000;
  }

  get deployCoGatewayGas() {
    return 8000000;
  }

  get activateGatewayGas() {
    return 2000000;
  }

  get setGatewayInBTGas() {
    return 100000;
  }

  get setCoGatewayInUBTGas() {
    return 100000;
  }

  get deployGatewayComposerGas() {
    return 8000000;
  }

  get setInternalActorInUBTGas() {
    return 60000;
  }

  get transferOstPrimeGas() {
    return 21000;
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

  get bountyForGateway() {
    return 0;
  }

  get bountyForCoGateway() {
    return 0;
  }

  // miscellaneous CONSTANTS END //

  get organizationExpirationHeight() {
    return 10000000;
  }
}

module.exports = new Contract();
