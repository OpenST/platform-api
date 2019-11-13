'use strict';
/**
 * Custom console log methods.
 *
 * @module lib/logger/customConsoleLogger
 */
const OSTBase = require('@ostdotcom/base'),
  Logger = OSTBase.Logger;

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants');

let loggerLevel;
let envVal = coreConstants.DEFAULT_LOG_LEVEL;
let strEnvVal = String(envVal).toUpperCase();

if (Logger.LOG_LEVELS.hasOwnProperty(strEnvVal)) {
  loggerLevel = Logger.LOG_LEVELS[strEnvVal];
} else {
  loggerLevel = Logger.LOG_LEVELS.INFO;
}

module.exports = new Logger('saas-api', loggerLevel);
