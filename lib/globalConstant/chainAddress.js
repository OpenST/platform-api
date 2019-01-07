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
  // Address kind enum types start
  deployerKind: 'deployer',
  simpleTokenOwnerKind: 'simpleTokenOwner',
  simpleTokenAdminKind: 'simpleTokenAdmin',
  baseContractKind: 'baseContract',
  baseContractOrganizationKind: 'baseContractOrganization',
  anchorOrganizationKind: 'anchorOrganization',
  anchorContractKind: 'anchorContract',
  chainOwnerKind: 'chainOwner',
  ownerKind: 'owner',
  adminKind: 'admin',
  workerKind: 'worker',
  merklePatriciaProofLibKind: 'merklePatriciaProofLib',
  messageBusLibKind: 'messageBusLib',
  gatewayLibKind: 'gatewayLib',
  gatewayContractKind: 'gatewayContract',
  coGatewayContractKind: 'coGatewayContract',
  sealerKind: 'sealer',
  // Address kind enum types end

  // Chain kind enum types start
  auxChainKind: 'aux',
  originChainKind: 'origin'
  // Chain kind enum types end
};

chainAddress.kinds = {
  '1': chainAddress.deployerKind,
  '2': chainAddress.simpleTokenOwnerKind,
  '3': chainAddress.simpleTokenAdminKind,
  '4': chainAddress.baseContractKind,
  '5': chainAddress.baseContractOrganizationKind,
  '6': chainAddress.chainOwnerKind,
  '7': chainAddress.ownerKind,
  '8': chainAddress.adminKind,
  '9': chainAddress.workerKind,
  '10': chainAddress.anchorOrganizationKind,
  '11': chainAddress.anchorContractKind,
  '12': chainAddress.merklePatriciaProofLibKind,
  '13': chainAddress.messageBusLibKind,
  '14': chainAddress.gatewayLibKind,
  '15': chainAddress.gatewayContractKind,
  '16': chainAddress.coGatewayContractKind,
  '17': chainAddress.sealerKind
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
  chainAddress.simpleTokenOwnerKind,
  chainAddress.simpleTokenAdminKind,
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
  chainAddress.coGatewayContractKind,
  chainAddress.sealerKind
];

module.exports = chainAddress;
