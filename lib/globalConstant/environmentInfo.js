'use strict';
/**
 * Environment constants
 *
 * @module lib/globalConstant/environmentInfo
 */
const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants');

// Declare constants.
const urlPrefix = {
  testnet: 'testnet',
  mainnet: 'mainnet'
};

/**
 * Class for environmentInfo.
 *
 * @class
 */
class EnvironmentInfo {
  /**
   * Constructor for environmentInfo.
   *
   * @constructor
   */
  constructor() {}

  get environment() {
    return {
      production: 'production',
      staging: 'staging',
      development: 'development'
    };
  }

  get subEnvironment() {
    return {
      sandbox: 'sandbox',
      main: 'main'
    };
  }

  /**
   * Get url prefix based on sub environment.
   *
   * @return {String}
   */
  get urlPrefix() {
    const oThis = this;

    if (coreConstants.subEnvironment === oThis.subEnvironment.main) {
      return urlPrefix.mainnet;
    }

    return urlPrefix.testnet;
  }
}

module.exports = new EnvironmentInfo();
