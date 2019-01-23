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
    return 3192135; // 2128090
  }

  get deployUBTGas() {
    return 2425319; // 1616879
  }

  get deployGatewayGas() {
    return 7584922; // 5056615
  }

  get deployCoGatewayGas() {
    return 6364552; // 4243035
  }

  get activateGatewayGas() {
    return 143746; // 95831
  }

  get setGatewayInBTGas() {
    return 103138; // 68759
  }

  get setCoGatewayInUBTGas() {
    return 76113; // 50742
  }

  get deployGatewayComposerGas() {
    return 2269290; // 1512860
  }

  get setInternalActorInUBTGas() {
    return 50000; // 49208
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
