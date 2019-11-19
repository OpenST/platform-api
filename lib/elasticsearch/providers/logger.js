'use strict';

/**
 * Custom console logger
 *
 * @module lib/elasticsearch/providers/logger
 */

const OSTBase = require('@ostdotcom/base');

const rootPrefix = '..',
  packageFile = require(rootPrefix + '/package.json'),
  Constants = require(rootPrefix + '/config/constants');

const Logger = OSTBase.Logger,
  packageName = packageFile.name;

let loggerLevel;
let envVal = Constants.DEFAULT_LOG_LEVEL;
let strEnvVal = String(envVal).toUpperCase();

if (Logger.LOG_LEVELS.hasOwnProperty(strEnvVal)) {
  loggerLevel = Logger.LOG_LEVELS[strEnvVal];
} else {
  loggerLevel = Logger.LOG_LEVELS.INFO;
}

const logger = new Logger(packageName, loggerLevel);

module.exports = logger;
