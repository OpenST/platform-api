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
      mainnet: 'mainnet'
    };
  }

  get urlPrefix() {
    const oThis = this;

    if (coreConstants.subEnvironment === oThis.subEnvironment.mainnet) return urlPrefix.mainnet;

    return urlPrefix.testnet;
  }
}

module.exports = new EnvironmentInfo();
