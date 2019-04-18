/**
 * Module to get funding config.
 *
 * @module config/funding
 */

const rootPrefix = '..',
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress');

const fundingAmounts = {};

fundingAmounts[chainAddressConstants.masterInternalFunderKind] = {
  originGas: {
    // Origin deployer.
    [chainAddressConstants.originDeployerKind]: {
      fundAmount: '0.2941',
      thresholdAmount: '0.1541'
    },

    // Origin stable coin deployer.
    [chainAddressConstants.originStableCoinDeployerKind]: {
      fundAmount: '1',
      thresholdAmount: '1'
    },

    // Origin anchor owner.
    [chainAddressConstants.originAnchorOrgContractOwnerKind]: {
      fundAmount: '0.00006',
      thresholdAmount: '0.00006'
    },

    // Origin ST organization owner.
    [chainAddressConstants.stOrgContractOwnerKind]: {
      fundAmount: '0.00012',
      thresholdAmount: '0.00012'
    },

    // Origin anchor admin.
    [chainAddressConstants.originAnchorOrgContractAdminKind]: {
      fundAmount: '0.0048',
      thresholdAmount: '0.0024'
    },

    // Token origin admin.
    [chainAddressConstants.originDefaultBTOrgContractAdminKind]: {
      fundAmount: '0.0024',
      thresholdAmount: '0.0012'
    },

    // Token origin worker.
    [chainAddressConstants.originDefaultBTOrgContractWorkerKind]: {
      fundAmount: '0.002',
      thresholdAmount: '0.001'
    },

    // Simple token owner.
    [chainAddressConstants.stContractOwnerKind]: {
      fundAmount: '0.00138',
      thresholdAmount: '0.00138'
    },

    // Simple token admin.
    [chainAddressConstants.stContractAdminKind]: {
      fundAmount: '0.00005',
      thresholdAmount: '0.00005'
    },

    // Usdc contract owner.
    [chainAddressConstants.usdcContractOwnerKind]: {
      fundAmount: '1',
      thresholdAmount: '1'
    },

    // Facilitator.
    [chainAddressConstants.interChainFacilitatorKind]: {
      fundAmount: '0.1044',
      thresholdAmount: '0.0522'
    }
  },

  auxGas: {
    // Aux deployer.
    [chainAddressConstants.auxDeployerKind]: {
      fundAmount: '0.537',
      thresholdAmount: '0.2685'
    },

    // Aux anchor admin.
    [chainAddressConstants.auxAnchorOrgContractAdminKind]: {
      fundAmount: '0.007',
      thresholdAmount: '0.0035'
    },

    // Aux Price Oracle workers.
    [chainAddressConstants.auxPriceOracleContractWorkerKind]: {
      fundAmount: '0.00384',
      thresholdAmount: '0.00192'
    },

    // Facilitator.
    [chainAddressConstants.interChainFacilitatorKind]: {
      fundAmount: '0.3124',
      thresholdAmount: '0.1562'
    }
  }
};

fundingAmounts[tokenAddressConstants.auxFunderAddressKind] = {
  originGas: {},
  auxGas: {
    // Token aux admin.
    [tokenAddressConstants.auxAdminAddressKind]: {
      fundAmount: '0.002',
      thresholdAmount: '0.001'
    },

    // Token aux workers.
    [tokenAddressConstants.auxWorkerAddressKind]: {
      fundAmount: '0.7078',
      thresholdAmount: '0.3539'
    },

    // Token ExTx workers.
    [tokenAddressConstants.txWorkerAddressKind]: {
      fundAmount: '30',
      thresholdAmount: '15'
    },

    // Token user multisig worker.
    [tokenAddressConstants.tokenUserOpsWorkerKind]: {
      fundAmount: '14.1661',
      thresholdAmount: '7.08305'
    },

    // Recovery controller.
    [tokenAddressConstants.recoveryControllerAddressKind]: {
      fundAmount: '0.0415',
      thresholdAmount: '0.02075'
    }
  }
};

module.exports = fundingAmounts;
