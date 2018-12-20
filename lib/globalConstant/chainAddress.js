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
  auxDeployerAddressType: 'auxDeployer',
  originDeployerAddressType: 'originDeployer'
  // address type enum types end
};

chainAddress.addressTypes = {
  '1': chainAddress.auxDeployerAddressType,
  '2': chainAddress.originDeployerAddressType
};

chainAddress.invertedAddressTypes = util.invert(chainAddress.addressTypes);

chainAddress.clientIdMandatoryForAddressTypes = [];

module.exports = chainAddress;
