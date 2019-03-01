'use strict';

/*
 * Standard Response Formatter
 */

const rootPrefix = '..',
  packageFile = require(rootPrefix + '/package.json'),
  packageName = packageFile.name,
  OSTBase = require('@ostdotcom/base'),
  responseHelper = new OSTBase.responseHelper({
    module_name: packageName
  }),
  errorConfig = require(rootPrefix + '/config/error_config');

const _super_error = responseHelper.error;
responseHelper.error = function(params) {
  if (params && typeof params === 'object') {
    if (!params.hasOwnProperty('error_config')) {
      params.error_config = errorConfig;
    }

    if (!params.hasOwnProperty('debug_options')) {
      params.debug_options = {};
    }
  }
  return _super_error.call(responseHelper, params);
};

module.exports = responseHelper;
