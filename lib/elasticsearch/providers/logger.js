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
  loggerLevel = Constants.DEBUG_ENABLED == '1' ? Logger.LOG_LEVELS.TRACE : Logger.LOG_LEVELS.INFO,
  packageName = packageFile.name;

const logger = new Logger(packageName, loggerLevel);

module.exports = logger;
