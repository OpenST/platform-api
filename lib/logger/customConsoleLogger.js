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

// Following is to ensure that INFO logs are printed when debug is off.
let loggerLevel;
if (1 === Number(coreConstants.DEBUG_ENABLED)) {
  loggerLevel = Logger.LOG_LEVELS.TRACE;
} else {
  loggerLevel = Logger.LOG_LEVELS.DEBUG;
}

module.exports = new Logger('saas-api', loggerLevel);
