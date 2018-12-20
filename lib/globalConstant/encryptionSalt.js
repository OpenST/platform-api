'use strict';

/**
 *
 * @module lib/globalConstant/encryptionSalt
 */
const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

// Declare constants.

const encryptionSalt = {
    // kind enum types start
    configStrategyKind: 'configStrategy'
    //kind enum types end
  },
  kind = {
    '1': encryptionSalt.configStrategyKind
  };

encryptionSalt.kinds = kind;
encryptionSalt.invertedKinds = util.invert(kind);

module.exports = encryptionSalt;
