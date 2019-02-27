'use strict';

const rootPrefix = '../..',
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
  fundAmount: '0.00720',
  thresholdAmount: '0.00400'
};
fundingAmounts[chainAddressConstants.masterInternalFunderKind].originGas[
  chainAddressConstants.originAnchorOrgContractOwnerKind
] = {
  fundAmount: '0.00720',
  thresholdAmount: '0.00400'
};

fundingAmounts[chainAddressConstants.masterInternalFunderKind].originGas[
  chainAddressConstants.stOrgContractOwnerKind
] = {
  fundAmount: '0.00720',
  thresholdAmount: '0.00400'
};

fundingAmounts[chainAddressConstants.masterInternalFunderKind].originGas[
  chainAddressConstants.interChainFacilitatorKind
] = {
  fundAmount: '0.00720',
  thresholdAmount: '0.00400'
};

fundingAmounts[chainAddressConstants.masterInternalFunderKind].originGas[
  chainAddressConstants.originDefaultBTOrgContractAdminKind
] = {
  fundAmount: '0.00720',
  thresholdAmount: '0.00400'
};

fundingAmounts[chainAddressConstants.masterInternalFunderKind].originGas[
  chainAddressConstants.originDefaultBTOrgContractWorkerKind
] = {
  fundAmount: '0.00720',
  thresholdAmount: '0.00400'
};

fundingAmounts[chainAddressConstants.masterInternalFunderKind].auxGas[
  chainAddressConstants.auxAnchorOrgContractAdminKind
] = {
  fundAmount: '0.00720',
  thresholdAmount: '0.00400'
};

fundingAmounts[chainAddressConstants.masterInternalFunderKind].auxGas[chainAddressConstants.auxDeployerKind] = {
  fundAmount: '0.00720',
  thresholdAmount: '0.00400'
};

fundingAmounts[chainAddressConstants.masterInternalFunderKind].auxGas[
  chainAddressConstants.interChainFacilitatorKind
] = {
  fundAmount: '0.00720',
  thresholdAmount: '0.00400'
};

fundingAmounts[chainAddressConstants.masterInternalFunderKind].auxGas[
  chainAddressConstants.auxPriceOracleContractWorkerKind
] = {
  fundAmount: '0.00720',
  thresholdAmount: '0.00400'
};

fundingAmounts[tokenAddressConstants.auxFunderAddressKind].auxGas[tokenAddressConstants.txWorkerAddressKind] = {
  fundAmount: '0.00720',
  thresholdAmount: '0.00400'
};

fundingAmounts[tokenAddressConstants.auxFunderAddressKind].auxGas[tokenAddressConstants.auxAdminAddressKind] = {
  fundAmount: '0.00720',
  thresholdAmount: '0.00400'
};

fundingAmounts[tokenAddressConstants.auxFunderAddressKind].auxGas[tokenAddressConstants.auxWorkerAddressKind] = {
  fundAmount: '0.00720',
  thresholdAmount: '0.00400'
};

fundingAmounts[tokenAddressConstants.auxFunderAddressKind].auxGas[tokenAddressConstants.tokenUserOpsWorkerKind] = {
  fundAmount: '0.00720',
  thresholdAmount: '0.00400'
};

module.exports = fundingAmounts;
