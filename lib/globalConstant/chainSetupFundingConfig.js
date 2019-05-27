'use strict';
/**
 * Funding config for addresses funded in chain setup
 *
 * @module lib/globalConstant/chainSetupFundingConfig
 */
const rootPrefix = '../..';

/**
 * Class for funding config
 *
 * @class
 */
class ChainSetupFundingConfig {
  /**
   *
   * @constructor
   */
  constructor() {}

  get stContractOwnerEthConfig() {
    return {
      fundAmount: '0.00138',
      thresholdAmount: '0.00138'
    };
  }

  get stContractAdminEthConfig() {
    return {
      fundAmount: '0.00005',
      thresholdAmount: '0.00005'
    };
  }

  get usdcContractOwnerEthConfig() {
    return {
      fundAmount: '0.00054',
      thresholdAmount: '0.00054'
    };
  }
}

module.exports = new ChainSetupFundingConfig();
