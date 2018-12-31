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
  // address kind enum types start
  deployerKind: 'deployer',
  baseContractOwnerKind: 'baseContractOwner',
  baseContractAdminKind: 'baseContractAdmin',
  baseContractKind: 'baseContract',
  organizationKind: 'organization',
  chainOwnerKind: 'chainOwner',
  // address kind enum types end

  // chain kind enum types start
  auxChainKind: 'aux',
  originChainKind: 'origin'
  // chain kind enum types end
};

chainAddress.kinds = {
  '1': chainAddress.deployerKind,
  '2': chainAddress.baseContractOwnerKind,
  '3': chainAddress.baseContractAdminKind,
  '4': chainAddress.baseContractKind,
  '5': chainAddress.organizationKind,
  '6': chainAddress.chainOwnerKind
};

chainAddress.invertedKinds = util.invert(chainAddress.kinds);

chainAddress.chainKinds = {
  '1': chainAddress.auxChainKind,
  '2': chainAddress.originChainKind
};

chainAddress.invertedKinds = util.invert(chainAddress.kinds);
chainAddress.invertedChainKinds = util.invert(chainAddress.chainKinds);

chainAddress.uniqueKinds = [
  chainAddress.baseContractKind,
  chainAddress.baseContractOwnerKind,
  chainAddress.baseContractAdminKind,
  chainAddress.organizationKind,
  chainAddress.chainOwnerKind
];

module.exports = chainAddress;
