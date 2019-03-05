'use strict';

const rootPrefix = '..',
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress');

const fundingAmounts = {};

fundingAmounts[chainAddressConstants.masterInternalFunderKind] = {
  originGas: {},
  auxGas: {}
};

fundingAmounts[tokenAddressConstants.auxFunderAddressKind] = {
  originGas: {},
  auxGas: {}
};

fundingAmounts[chainAddressConstants.masterInternalFunderKind].originGas[chainAddressConstants.originDeployerKind] = {
  fundAmount: '0.2621',
  thresholdAmount: '0.1381'
};
fundingAmounts[chainAddressConstants.masterInternalFunderKind].originGas[
  chainAddressConstants.originAnchorOrgContractOwnerKind
] = {
  fundAmount: '0.00006',
  thresholdAmount: '0.00006'
};

fundingAmounts[chainAddressConstants.masterInternalFunderKind].originGas[
  chainAddressConstants.stOrgContractOwnerKind
] = {
  fundAmount: '0.00012',
  thresholdAmount: '0.00012'
};

fundingAmounts[chainAddressConstants.masterInternalFunderKind].originGas[
  chainAddressConstants.interChainFacilitatorKind
] = {
  fundAmount: '0.1044',
  thresholdAmount: '0.0522'
};

fundingAmounts[chainAddressConstants.masterInternalFunderKind].originGas[
  chainAddressConstants.originDefaultBTOrgContractAdminKind
] = {
  fundAmount: '0.0024',
  thresholdAmount: '0.0012'
};

fundingAmounts[chainAddressConstants.masterInternalFunderKind].originGas[
  chainAddressConstants.originDefaultBTOrgContractWorkerKind
] = {
  fundAmount: '0.002',
  thresholdAmount: '0.001'
};

fundingAmounts[chainAddressConstants.masterInternalFunderKind].originGas[
  chainAddressConstants.originAnchorOrgContractAdminKind
] = {
  fundAmount: '0.0048',
  thresholdAmount: '0.0024'
};

fundingAmounts[chainAddressConstants.masterInternalFunderKind].originGas[chainAddressConstants.stContractOwnerKind] = {
  fundAmount: '0.00138',
  thresholdAmount: '0.00138'
};

fundingAmounts[chainAddressConstants.masterInternalFunderKind].originGas[chainAddressConstants.stContractAdminKind] = {
  fundAmount: '0.00005',
  thresholdAmount: '0.00005'
};

fundingAmounts[chainAddressConstants.masterInternalFunderKind].auxGas[
  chainAddressConstants.auxAnchorOrgContractAdminKind
] = {
  fundAmount: '0.007',
  thresholdAmount: '0.0035'
};

fundingAmounts[chainAddressConstants.masterInternalFunderKind].auxGas[chainAddressConstants.auxDeployerKind] = {
  fundAmount: '0.537',
  thresholdAmount: '0.2685'
};

fundingAmounts[chainAddressConstants.masterInternalFunderKind].auxGas[
  chainAddressConstants.interChainFacilitatorKind
] = {
  fundAmount: '0.3124',
  thresholdAmount: '0.1562'
};

fundingAmounts[chainAddressConstants.masterInternalFunderKind].auxGas[
  chainAddressConstants.auxPriceOracleContractWorkerKind
] = {
  fundAmount: '0.00384',
  thresholdAmount: '0.00192'
};

fundingAmounts[tokenAddressConstants.auxFunderAddressKind].auxGas[tokenAddressConstants.txWorkerAddressKind] = {
  fundAmount: '60',
  thresholdAmount: '30'
};

fundingAmounts[tokenAddressConstants.auxFunderAddressKind].auxGas[tokenAddressConstants.auxAdminAddressKind] = {
  fundAmount: '0.002',
  thresholdAmount: '0.001'
};

fundingAmounts[tokenAddressConstants.auxFunderAddressKind].auxGas[tokenAddressConstants.auxWorkerAddressKind] = {
  fundAmount: '0.7066',
  thresholdAmount: '0.03533'
};

fundingAmounts[tokenAddressConstants.auxFunderAddressKind].auxGas[tokenAddressConstants.tokenUserOpsWorkerKind] = {
  fundAmount: '13.4915',
  thresholdAmount: '6.74575'
};

fundingAmounts[tokenAddressConstants.auxFunderAddressKind].auxGas[
  tokenAddressConstants.recoveryControllerAddressKind
] = {
  fundAmount: '0.0575',
  thresholdAmount: '0.02875'
};

module.exports = fundingAmounts;
