'use strict';

const rootPrefix = '../..',
  currencyConstants = require(rootPrefix + '/lib/globalConstant/currencies'),
  workFlowKinds = require(rootPrefix + '/lib/globalConstant/workflow'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  chainAddressConst = require(rootPrefix + '/lib/globalConstant/chainAddress');

const BigNumber = require('bignumber.js');

const currencyFundConfig = {
  [currencyConstants.stPrime]: {
    [workFlowKinds.stPrimeStakeAndMintKind]: {
      [chainAddressConst.facilitator]: '0.000000000000833905',
      [chainAddressConst.adminKind]: '0.000000000000080636'
    },
    [workFlowKinds.tokenDeployKind]: {
      [chainAddressConst.deployerKind]: '1',
      [chainAddressConst.ownerKind]: '1'
    },
    [workFlowKinds.btStakeAndMintKind]: {
      [chainAddressConst.adminKind]: '0',
      [chainAddressConst.workerKind]: '1'
    }
  },

  [currencyConstants.eth]: {
    [workFlowKinds.stPrimeStakeAndMintKind]: {
      [chainAddressConst.chainOwnerKind]: '0.000000000000045610',
      [chainAddressConst.facilitator]: '0.000000000000322523'
    },
    [workFlowKinds.tokenDeployKind]: {
      [chainAddressConst.deployerKind]: '1',
      [chainAddressConst.tokenAdminKind]: '1',
      [chainAddressConst.tokenWorkerKind]: '1'
    },
    [workFlowKinds.btStakeAndMintKind]: {
      [chainAddressConst.adminKind]: '0'
    }
  }
};

const workflowMultiplierConfig = {
  [workFlowKinds.stPrimeStakeAndMintKind]: 1,
  [workFlowKinds.tokenDeployKind]: 1,
  [workFlowKinds.btStakeAndMintKind]: 1
};

class MinBalances {
  constructor() {}

  /**
   * Compute balance requirement
   * @private
   */
  _computeRequirement(currentBalanceWeis, balanceToAdd, multiplier) {
    const oThis = this;

    multiplier = new BigNumber(multiplier);

    let currentBalance = new BigNumber(currentBalanceWeis);

    balanceToAdd = basicHelper.convertToWei(balanceToAdd).mul(multiplier);

    let finalAmount = currentBalance.add(balanceToAdd);
    return finalAmount.toString(10);
  }

  /**
   * getBalances
   *
   * @param addressKind
   * @param currencyType
   * @return {}
   */
  getBalances() {
    const oThis = this;

    let minimumBalances = {
      [currencyConstants.stPrime]: {},
      [currencyConstants.eth]: {}
    };

    for (let currency in currencyFundConfig) {
      let workflowConfig = currencyFundConfig[currency];

      for (let workflow in workflowConfig) {
        let addressKindConfig = workflowConfig[workflow],
          multiplier = workflowMultiplierConfig[workflow];

        for (let addressKind in addressKindConfig) {
          if (!minimumBalances[currency].hasOwnProperty(addressKind)) {
            minimumBalances[currency][addressKind] = '0';
          }

          minimumBalances[currency][addressKind] = oThis._computeRequirement(
            minimumBalances[currency][addressKind],
            addressKindConfig[addressKind],
            multiplier
          );
        }
      }
    }

    return minimumBalances;
  }
}

module.exports = new MinBalances().getBalances();
