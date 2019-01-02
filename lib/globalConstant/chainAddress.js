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
  ownerKind: 'owner',
  adminKind: 'admin',
  baseContractKind: 'baseContract',
  baseContractOrganizationKind: 'baseContractOrganization',
  anchorOrganizationKind: 'anchorOrganization',
  anchorContractKind: 'anchorContract',
  chainOwnerKind: 'chainOwner',
  workerKind: 'worker',
  merklePatriciaProofLibKind: 'merklePatriciaProofLib',
  messageBusLibKind: 'messageBusLib',
  gatewayLibKind: 'gatewayLib',
  gatewayContractKind: 'gatewayContract',
  coGatewayContractKind: 'coGatewayContract',
  // address kind enum types end

  // chain kind enum types start
  auxChainKind: 'aux',
  originChainKind: 'origin'
  // chain kind enum types end
};

chainAddress.kinds = {
  '1': chainAddress.deployerKind,
  '2': chainAddress.ownerKind,
  '3': chainAddress.adminKind,
  '4': chainAddress.baseContractKind,
  '5': chainAddress.baseContractOrganizationKind,
  '6': chainAddress.chainOwnerKind,
  '7': chainAddress.workerKind,
  '8': chainAddress.anchorOrganizationKind,
  '9': chainAddress.anchorContractKind,
  '10': chainAddress.merklePatriciaProofLibKind,
  '11': chainAddress.messageBusLibKind,
  '12': chainAddress.gatewayLibKind,
  '13': chainAddress.gatewayContractKind,
  '14': chainAddress.coGatewayContractKind
};

chainAddress.invertedKinds = util.invert(chainAddress.kinds);

chainAddress.chainKinds = {
  '1': chainAddress.auxChainKind,
  '2': chainAddress.originChainKind
};

chainAddress.invertedKinds = util.invert(chainAddress.kinds);
chainAddress.invertedChainKinds = util.invert(chainAddress.chainKinds);

chainAddress.uniqueKinds = [
  chainAddress.deployerKind,
  chainAddress.baseContractKind,
  chainAddress.ownerKind,
  chainAddress.adminKind,
  chainAddress.baseContractOrganizationKind,
  chainAddress.chainOwnerKind,
  chainAddress.anchorOrganizationKind,
  chainAddress.anchorContractKind,
  chainAddress.merklePatriciaProofLibKind,
  chainAddress.messageBusLibKind,
  chainAddress.gatewayLibKind,
  chainAddress.gatewayContractKind,
  chainAddress.coGatewayContractKind
];

module.exports = chainAddress;
