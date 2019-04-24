'use strict';
/**
 * Grant constants.
 *
 * @module lib/globalConstant/grant
 */

class Grant {
  /**
   * Constructor for fetching chainId
   *
   * @constructor
   */
  constructor() {}

  get grantEthValueInWei() {
    return '200000000000000000';
  }

  get grantOstValueInWei() {
    return '10000000000000000000000';
  }

  get grantUsdcValueInWei() {
    return '10000000000000000000000'; //TODO: Change on PM demand
  }
}

module.exports = new Grant();
