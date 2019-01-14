'use strict';
/**
 * Chain Id constants
 *
 * @module lib/globalConstant/chainId
 */
const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  environmentConst = require(rootPrefix + '/lib/globalConstant/environmentInfo');

/**
 * Class for fetching chainId
 *
 * @class
 */
class ChainId {
  /**
   * Constructor for fetching chainId
   *
   * @constructor
   */
  constructor() {}

  get ropsten() {
    return 3;
  }

  get mainnet() {
    return 1;
  }

  getChainId() {
    const oThis = this;

    if (
      coreConstants.environment === environmentConst.environment.production &&
      coreConstants.subEnvironment === environmentConst.subEnvironment.mainnet
    )
      return oThis.mainnet;
    else return oThis.ropsten;
  }
}

module.exports = new ChainId();
