/**
 * Module for grant constants.
 *
 * @module lib/globalConstant/grant
 */

/**
 * Class for grant constants.
 *
 * @class Grant
 */
class Grant {
  get grantEthValueInWei() {
    return '200000000000000000';
  }

  get grantOstValueInWei() {
    return '10000000000000000000000';
  }

  get grantUsdcValueInWei() {
    return '10000000000'; //TODO: Change on PM demand
  }
}

module.exports = new Grant();
