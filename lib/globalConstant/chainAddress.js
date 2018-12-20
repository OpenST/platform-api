'use strict';

/**
 * chain address constants
 *
 * @module lib/globalConstant/chainAddress
 */
const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

// Declare constants.

const chainAddress = {
  // address type enum types start
  auxDeployerKind: 'auxDeployer',
  originDeployerKind: 'originDeployer'
  // address type enum types end
};

chainAddress.kinds = {
  '1': chainAddress.auxDeployerKind,
  '2': chainAddress.originDeployerKind
};

chainAddress.invertedKinds = util.invert(chainAddress.kinds);

chainAddress.clientIdMandatoryForKinds = [];

module.exports = chainAddress;
