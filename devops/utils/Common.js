'use strict';

const fs = require('fs');

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Common helper to perform util tasks
 *
 * @class
 */
class CommonHelper {
  parseCmdOutput(outFile, outData) {
    outData = outData || {};

    if (outFile) {
      fs.writeFileSync(outFile, JSON.stringify(outData));
    }

    return responseHelper.successWithData(outData);
  }
}

module.exports = CommonHelper;
