'use strict';
/**
 * Chain address constants
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
  tokenAdminKind: 'tokenAdmin',
  workerKind: 'worker',
  tokenWorkerKind: 'tokenWorker',
  merklePatriciaProofLibKind: 'merklePatriciaProofLib',
  messageBusLibKind: 'messageBusLib',
  gatewayLibKind: 'gatewayLib',
  originGatewayContractKind: 'gatewayContract',
  auxCoGatewayContractKind: 'coGatewayContract',
  sealerKind: 'sealer',
  simpleStakeContractKind: 'simpleStakeContract',
  granterKind: 'granter',
  facilitator: 'facilitator',
  // Address kind enum types end

  activeStatus: 'active',
  inActiveStatus: 'inactive'
};

chainAddress.kinds = {
  '1': chainAddress.deployerKind,
  '2': chainAddress.simpleTokenOwnerKind,
  '3': chainAddress.simpleTokenAdminKind,
  '4': chainAddress.baseContractKind, //Simple token contract for origin.  OST Prime contract for aux
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
  '18': chainAddress.sealerKind,
  '19': chainAddress.simpleStakeContractKind,
  '20': chainAddress.granterKind,
  '21': chainAddress.tokenAdminKind,
  '22': chainAddress.tokenWorkerKind,
  '23': chainAddress.facilitator
};

chainAddress.invertedKinds = util.invert(chainAddress.kinds);

chainAddress.chainKinds = {
  '1': coreConstants.originChainKind,
  '2': coreConstants.auxChainKind
};

chainAddress.invertedChainKinds = util.invert(chainAddress.chainKinds);

chainAddress.statuses = {
  '1': chainAddress.activeStatus,
  '2': chainAddress.inActiveStatus
};

chainAddress.invertedStatuses = util.invert(chainAddress.statuses);

//TODO @dhananjay:- store non-uniqueKinds instead of uniqueKinds
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
  chainAddress.tokenAdminKind,
  chainAddress.tokenWorkerKind,
  chainAddress.facilitator
];

chainAddress.pairAddressKinds = [
  chainAddress.originAnchorContractKind,
  chainAddress.auxAnchorContractKind,
  chainAddress.originGatewayContractKind,
  chainAddress.auxCoGatewayContractKind,
  chainAddress.simpleStakeContractKind,
  chainAddress.tokenAdminKind,
  chainAddress.tokenWorkerKind,
  chainAddress.facilitator
];

module.exports = chainAddress;
