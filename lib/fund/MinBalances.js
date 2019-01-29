'use strict';

const rootPrefix = '../..',
  currencyConstants = require(rootPrefix + '/lib/globalConstant/currencies'),
  workFlowKinds = require(rootPrefix + '/lib/globalConstant/workflow'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  chainAddressConst = require(rootPrefix + '/lib/globalConstant/chainAddress');

const BigNumber = require('bignumber.js');

/*
 * All values are computed at below gas prices
 *
 * Origin - 60 GWeis
 * Aux    - 1 GWeis
 */

const currencyFundConfig = {
  [currencyConstants.eth]: {
    [workFlowKinds.stPrimeStakeAndMintKind]: {
      [chainAddressConst.facilitator]: '0.290271'
    },
    [workFlowKinds.tokenDeployKind]: {
      [chainAddressConst.deployerKind]: '0.78279813',
      [chainAddressConst.tokenAdminKind]: '0.00862479',
      [chainAddressConst.tokenWorkerKind]: '0.00618831'
    },
    [workFlowKinds.btStakeAndMintKind]: {
      [chainAddressConst.facilitator]: '0.0005727795'
    }
  },

  [currencyConstants.stPrime]: {
    [workFlowKinds.stPrimeStakeAndMintKind]: {
      [chainAddressConst.facilitator]: '0.0012508575',
      [chainAddressConst.adminKind]: '0.000120954'
    },
    [workFlowKinds.tokenDeployKind]: {
      [chainAddressConst.deployerKind]: '0.008790063'
    },
    [workFlowKinds.btStakeAndMintKind]: {
      [chainAddressConst.facilitator]: '0.07353144',
      [chainAddressConst.adminKind]: '0.00728379'
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
