'use strict';

/**
 * chain address constants
 *
 * @module lib/globalConstant/chainAddress
 */
const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

// Declare constants.

const chainAddress = {
  // Address kind enum types start
  deployerKind: 'deployer',
  simpleTokenOwnerKind: 'simpleTokenOwner',
  simpleTokenAdminKind: 'simpleTokenAdmin',
  baseContractKind: 'baseContract',
  baseContractOrganizationKind: 'baseContractOrganization',
  anchorOrganizationKind: 'anchorOrganization',
  originAnchorContractKind: 'originAnchorContract',
  auxAnchorContractKind: 'auxAnchorContract',
  chainOwnerKind: 'chainOwner',
  ownerKind: 'owner',
  adminKind: 'admin',
  workerKind: 'worker',
  merklePatriciaProofLibKind: 'merklePatriciaProofLib',
  messageBusLibKind: 'messageBusLib',
  gatewayLibKind: 'gatewayLib',
  originGatewayContractKind: 'gatewayContract',
  auxCoGatewayContractKind: 'coGatewayContract',
  sealerKind: 'sealer',
  // Address kind enum types end

  // Chain kind enum types start
  auxChainKind: coreConstants.auxChainKind,
  originChainKind: coreConstants.originChainKind,
  // Chain kind enum types end

  activeStatus: 'active',
  inActiveStatus: 'inactive'
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
  '11': chainAddress.originAnchorContractKind,
  '12': chainAddress.auxAnchorContractKind,
  '13': chainAddress.merklePatriciaProofLibKind,
  '14': chainAddress.messageBusLibKind,
  '15': chainAddress.gatewayLibKind,
  '16': chainAddress.originGatewayContractKind,
  '17': chainAddress.auxCoGatewayContractKind,
  '18': chainAddress.sealerKind
};

chainAddress.invertedKinds = util.invert(chainAddress.kinds);

chainAddress.chainKinds = {
  '1': chainAddress.originChainKind,
  '2': chainAddress.auxChainKind
};

chainAddress.invertedChainKinds = util.invert(chainAddress.chainKinds);

chainAddress.statuses = {
  '1': chainAddress.activeStatus,
  '2': chainAddress.inActiveStatus
};

chainAddress.invertedStatuses = util.invert(chainAddress.statuses);

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
  chainAddress.originAnchorContractKind,
  chainAddress.auxAnchorContractKind,
  chainAddress.merklePatriciaProofLibKind,
  chainAddress.messageBusLibKind,
  chainAddress.gatewayLibKind,
  chainAddress.originGatewayContractKind,
  chainAddress.auxCoGatewayContractKind,
  chainAddress.sealerKind
];

module.exports = chainAddress;
