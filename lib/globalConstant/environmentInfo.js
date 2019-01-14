'use strict';
/**
 * Chain Id constants
 *
 * @module lib/globalConstant/environmentInfo
 */

// Declare constants.
const environmentInfo = {};

environmentInfo['environment'] = {
  production: 'production',
  staging: 'staging',
  development: 'development'
};

environmentInfo['subEnvironment'] = {
  sandbox: 'sandbox',
  mainnet: 'mainnet'
};

module.exports = environmentInfo;
