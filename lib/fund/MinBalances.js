'use strict';

const rootPrefix = '../..',
  currencyConstants = require(rootPrefix + '/lib/globalConstant/currencies'),
  workFlowKinds = require(rootPrefix + '/lib/globalConstant/workflow'),
  chainAddressConst = require(rootPrefix + '/lib/globalConstant/chainAddress');

const chainAddressFundConfig = {
  [currencyConstants.stPrime]: {
    [workFlowKinds.stPrimeStakeAndMintKind]: {
      [chainAddressConst.facilitator]: ''
    },
    [workFlowKinds.tokenDeployKind]: {
      [chainAddressConst.deployerKind]: '',
      [chainAddressConst.adminKind]: '',
      [chainAddressConst.workerKind]: ''
    },
    [workFlowKinds.btStakeAndMintKind]: {
      [chainAddressConst.facilitator]: ''
    }
  },

  [currencyConstants.eth]: {
    [workFlowKinds.stPrimeStakeAndMintKind]: {
      [chainAddressConst.facilitator]: ''
    },
    [workFlowKinds.tokenDeployKind]: {
      [chainAddressConst.deployerKind]: '',
      [chainAddressConst.adminKind]: '',
      [chainAddressConst.workerKind]: ''
    },
    [workFlowKinds.btStakeAndMintKind]: {
      [chainAddressConst.facilitator]: ''
    }
  }
};

const workflowMultiplierConfig = {
  [workFlowKinds.stPrimeStakeAndMintKind]: 10,
  [workFlowKinds.tokenDeployKind]: 10,
  [workFlowKinds.btStakeAndMintKind]: 10
};

class MinBalances {
  constructor() {}

  /**
   * getBalances
   *
   * @param addressKind
   * @param currencyType
   * @return {}
   */
  getBalances() {
    const oThis = this;

    let minimumBalances = {};

    for (let currency in chainAddressFundConfig) {
      let currencyConfig = chainAddressFundConfig[currency];

      for (let workflow in currencyConfig) {
        for (let address in workflow) {
          minimumBalances[currency][address] =
            parseFloat(minimumBalances[currency][address]) * workflowMultiplierConfig[workflow];
        }
      }
    }

    return minimumBalances;
  }
}

module.exports = new MinBalances().getBalances();
