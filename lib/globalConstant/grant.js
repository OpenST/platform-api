'use strict';
/**
 * Grant constants.
 *
 * @module lib/globalConstant/grant
 */

/**
 * Class for fetching chainId
 *
 * @class
 */
class Grant {
  /**
   * Constructor for fetching chainId
   *
   * @constructor
   */
  constructor() {}

  get grantEthValue() {
    return 200000000000000000;
  }

  get grantOstValue() {
    return 10000;
  }
}

module.exports = new Grant();
