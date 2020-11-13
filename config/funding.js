/**
 * Module to get funding config.
 *
 * @module config/funding
 */

const rootPrefix = '..',
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress');

const fundingAmounts = {};

fundingAmounts[chainAddressConstants.masterInternalFunderKind] = {
  originGas: {
    // origin deployer
    [chainAddressConstants.originDeployerKind]: {
      fundAmount: coreConstants.FUND_FOR_CHAIN_SETUP ? '0.02810' : '0.01400',
      thresholdAmount: coreConstants.FUND_FOR_CHAIN_SETUP ? '0.01405' : '0.0070'
    },

    // origin anchor owner
    [chainAddressConstants.originAnchorOrgContractOwnerKind]: {
      fundAmount: coreConstants.FUND_FOR_CHAIN_SETUP ? '0.00006' : '0',
      thresholdAmount: coreConstants.FUND_FOR_CHAIN_SETUP ? '0.00003' : '0',
    },

    // origin ST organization owner
    [chainAddressConstants.stOrgContractOwnerKind]: {
      fundAmount: coreConstants.FUND_FOR_CHAIN_SETUP ? '0.00012' : '0',
      thresholdAmount: coreConstants.FUND_FOR_CHAIN_SETUP ? '0.00006' : '0'
    },

    // origin anchor admin
    [chainAddressConstants.originAnchorOrgContractAdminKind]: {
      fundAmount: coreConstants.FUND_FOR_CHAIN_SETUP ? '0.0001' : '0.0001',
      thresholdAmount: coreConstants.FUND_FOR_CHAIN_SETUP ? '0.00005' : '0.00005'
    },

    // token origin admin
    [chainAddressConstants.originDefaultBTOrgContractAdminKind]: {
      fundAmount: coreConstants.FUND_FOR_CHAIN_SETUP ? '0.00012' : '0.00012',
      thresholdAmount: coreConstants.FUND_FOR_CHAIN_SETUP ? '0.00006' : '0.00006'
    },

    // token origin worker.
    [chainAddressConstants.originDefaultBTOrgContractWorkerKind]: {
      fundAmount: coreConstants.FUND_FOR_CHAIN_SETUP ? '0.00010' : '0.00010',
      thresholdAmount: coreConstants.FUND_FOR_CHAIN_SETUP ? '0.00005' : '0.00005'
    },

    // facilitator
    [chainAddressConstants.interChainFacilitatorKind]: {
      fundAmount: coreConstants.FUND_FOR_CHAIN_SETUP ? '0.00540' : '0.00540',
      thresholdAmount: coreConstants.FUND_FOR_CHAIN_SETUP ? '0.0027' : '0.0027'
    },

    // stable coin deployer
    [chainAddressConstants.originStableCoinDeployerKind]: {
      fundAmount: coreConstants.FUND_FOR_CHAIN_SETUP ? '0.00498' : '0',
      thresholdAmount: coreConstants.FUND_FOR_CHAIN_SETUP ? '0.00249' : '0'
    }
  },

  auxGas: {
    // aux deployer
    [chainAddressConstants.auxDeployerKind]: {
      fundAmount: '0.537',
      thresholdAmount: '0.2685'
    },

    // aux anchor admin
    [chainAddressConstants.auxAnchorOrgContractAdminKind]: {
      fundAmount: '0.007',
      thresholdAmount: '0.0035'
    },

    // aux Price Oracle workers
    [chainAddressConstants.auxPriceOracleContractWorkerKind]: {
      fundAmount: '0.00384',
      thresholdAmount: '0.00192'
    },

    // facilitator
    [chainAddressConstants.interChainFacilitatorKind]: {
      fundAmount: '0.3124',
      thresholdAmount: '0.1562'
    }
  }
};

fundingAmounts[tokenAddressConstants.auxFunderAddressKind] = {
  originGas: {},
  auxGas: {
    // token aux admin
    [tokenAddressConstants.auxAdminAddressKind]: {
      fundAmount: '0.002',
      thresholdAmount: '0.001'
    },

    // token aux workers
    [tokenAddressConstants.auxWorkerAddressKind]: {
      fundAmount: '0.1678',
      thresholdAmount: '0.0839'
    },

    // token ExTx workers
    [tokenAddressConstants.txWorkerAddressKind]: {
      fundAmount: '3',
      thresholdAmount: '1.5'
    },

    // token user multisig worker
    [tokenAddressConstants.tokenUserOpsWorkerKind]: {
      fundAmount: '2.4661',
      thresholdAmount: '1.23305'
    },

    // recovery controller
    [tokenAddressConstants.recoveryControllerAddressKind]: {
      fundAmount: '0.0415',
      thresholdAmount: '0.02075'
    }
  }
};

module.exports = fundingAmounts;
