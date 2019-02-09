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
}

module.exports = new Grant();
