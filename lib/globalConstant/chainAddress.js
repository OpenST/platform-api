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
  auxDeployerKind: 'auxDeployer',
  originDeployerKind: 'originDeployer',
  stContractOwnerKind: 'stContractOwner',
  stContractAdminKind: 'stContractAdmin',
  stContractKind: 'stContract',
  stPrimeContractKind: 'stPrimeContract',
  stOrgContractKind: 'stOrgContract',
  stPrimeOrgContractKind: 'stPrimeOrgContract',
  masterInternalFunderKind: 'masterInternalFunder',
  stOrgContractOwnerKind: 'stOrgContractOwner',
  stPrimeOrgContractOwnerKind: 'stPrimeOrgContractOwner',
  originAnchorOrgContractOwnerKind: 'originAnchorOrgContractOwner',
  auxAnchorOrgContractOwnerKind: 'auxAnchorOrgContractOwner',
  auxPriceOracleContractOwnerKind: 'auxPriceOracleContractOwner',
  stOrgContractAdminKind: 'stOrgContractAdmin',
  stPrimeOrgContractAdminKind: 'stPrimeOrgContractAdmin',
  originAnchorOrgContractAdminKind: 'originAnchorOrgContractAdmin',
  auxAnchorOrgContractAdminKind: 'auxAnchorOrgContractAdmin',
  auxPriceOracleContractAdminKind: 'auxPriceOracleContractAdmin',
  stOrgContractWorkerKind: 'stOrgContractWorker',
  stPrimeOrgContractWorkerKind: 'stPrimeOrgContractWorker',
  originAnchorOrgContractWorkerKind: 'originAnchorOrgContractWorker',
  auxAnchorOrgContractWorkerKind: 'auxAnchorOrgContractWorker',
  originAnchorOrgContractKind: 'originAnchorOrgContract',
  auxAnchorOrgContractKind: 'auxAnchorOrgContract',
  originAnchorContractKind: 'originAnchorContract',
  auxAnchorContractKind: 'auxAnchorContract',
  originMppLibContractKind: 'originMppLibContract',
  auxMppLibContractKind: 'auxMppLibContract',
  originMbLibContractKind: 'originMbLibContract',
  auxMbLibContractKind: 'auxMbLibContract',
  originGatewayLibContractKind: 'originGatewayLibContract',
  auxGatewayLibContractKind: 'auxGatewayLibContract',
  originGatewayContractKind: 'originGatewayContract',
  auxCoGatewayContractKind: 'auxCoGatewayContract',
  auxSealerKind: 'auxSealer',
  stSimpleStakeContractKind: 'stSimpleStakeContract',
  originGranterKind: 'originGranter',
  originDefaultBTOrgContractAdminKind: 'originDefaultBTOrgContractAdmin',
  originDefaultBTOrgContractWorkerKind: 'originDefaultBTOrgContractWorker',
  interChainFacilitatorKind: 'interChainFacilitator',
  auxPriceOracleContractKind: 'auxPriceOracleContract',
  auxPriceOracleContractWorkerKind: 'auxPriceOracleContractWorker',
  usdcContractOwnerKind: 'usdcContractOwner',
  // Address kind enum types end

  activeStatus: 'active',
  inActiveStatus: 'inactive'
};

chainAddress.kinds = {
  '1': chainAddress.auxDeployerKind,
  '2': chainAddress.originDeployerKind,
  '3': chainAddress.stContractOwnerKind,
  '4': chainAddress.stContractAdminKind,
  '5': chainAddress.stContractKind,
  '6': chainAddress.stPrimeContractKind,
  '7': chainAddress.stOrgContractKind,
  '8': chainAddress.stPrimeOrgContractKind,
  '9': chainAddress.masterInternalFunderKind,
  '10': chainAddress.stOrgContractOwnerKind,
  '11': chainAddress.stPrimeOrgContractOwnerKind,
  '12': chainAddress.originAnchorOrgContractOwnerKind,
  '13': chainAddress.auxAnchorOrgContractOwnerKind,
  '14': chainAddress.auxPriceOracleContractOwnerKind,
  '15': chainAddress.stOrgContractAdminKind,
  '16': chainAddress.stPrimeOrgContractAdminKind,
  '17': chainAddress.originAnchorOrgContractAdminKind,
  '18': chainAddress.auxAnchorOrgContractAdminKind,
  '19': chainAddress.auxPriceOracleContractAdminKind,
  '20': chainAddress.stOrgContractWorkerKind,
  '21': chainAddress.stPrimeOrgContractWorkerKind,
  '22': chainAddress.originAnchorOrgContractWorkerKind,
  '23': chainAddress.auxAnchorOrgContractWorkerKind,
  '24': chainAddress.originAnchorOrgContractKind,
  '25': chainAddress.auxAnchorOrgContractKind,
  '26': chainAddress.originAnchorContractKind,
  '27': chainAddress.auxAnchorContractKind,
  '28': chainAddress.originMppLibContractKind,
  '29': chainAddress.auxMppLibContractKind,
  '30': chainAddress.originMbLibContractKind,
  '31': chainAddress.auxMbLibContractKind,
  '32': chainAddress.originGatewayLibContractKind,
  '33': chainAddress.auxGatewayLibContractKind,
  '34': chainAddress.originGatewayContractKind,
  '35': chainAddress.auxCoGatewayContractKind,
  '36': chainAddress.auxSealerKind,
  '37': chainAddress.stSimpleStakeContractKind,
  '38': chainAddress.originGranterKind,
  '39': chainAddress.originDefaultBTOrgContractAdminKind,
  '40': chainAddress.originDefaultBTOrgContractWorkerKind,
  '41': chainAddress.interChainFacilitatorKind,
  '42': chainAddress.auxPriceOracleContractKind,
  '43': chainAddress.auxPriceOracleContractWorkerKind,
  '44': chainAddress.usdcContractOwnerKind
};

chainAddress.invertedKinds = util.invert(chainAddress.kinds);

chainAddress.deployedChainKinds = {
  '1': coreConstants.originChainKind,
  '2': coreConstants.auxChainKind
};

chainAddress.invertedDeployedChainKinds = util.invert(chainAddress.deployedChainKinds);

chainAddress.statuses = {
  '1': chainAddress.activeStatus,
  '2': chainAddress.inActiveStatus
};

chainAddress.invertedStatuses = util.invert(chainAddress.statuses);

chainAddress.nonUniqueKinds = [
  chainAddress.stOrgContractWorkerKind,
  chainAddress.stPrimeOrgContractWorkerKind,
  chainAddress.originAnchorOrgContractWorkerKind,
  chainAddress.auxAnchorOrgContractWorkerKind,
  chainAddress.auxSealerKind,
  chainAddress.auxPriceOracleContractWorkerKind
];

module.exports = chainAddress;
