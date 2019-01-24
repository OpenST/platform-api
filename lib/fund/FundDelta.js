'use strict';

const rootPrefix = '../..',
  currencyConstants = require(rootPrefix + '/lib/globalConstant/currencies'),
  workFlowKinds = require(rootPrefix + '/lib/globalConstant/workflow'),
  chainAddressConst = require(rootPrefix + '/lib/globalConstant/chainAddress');

const fundConfig = {
  [currencyConstants.stPrime]: {
    [workFlowKinds.stPrimeStakeAndMintKind]: {
      [chainAddressConst.staker]: '',
      [chainAddressConst.facilitator]: ''
    }
  },
  [currencyConstants.eth]: {
    [workFlowKinds.stPrimeStakeAndMintKind]: {}
  }
};

const workflowMultiplierConfig = {
  [workFlowKinds.stPrimeStakeAndMintKind]: '10',
  [workFlowKinds.tokenDeployKind]: '',
  [workFlowKinds.stateRootSyncKind]: '',
  [workFlowKinds.btStakeAndMintKind]: ''
};

const config = {
  fundConfig: fundConfig,
  workflowMultiplierConfig: workflowMultiplierConfig
};

class FundDelta {
  constructor() {}

  /**
   * getDelta
   *
   * @param addressKind
   * @param currencyType
   * @return {float}
   */
  getDelta(addressKind, currencyType) {
    const oThis = this;

    let currencyFundConfig = config[currencyType];

    let result = 0;

    for (let workflowKind in currencyFundConfig) {
      if (currencyFundConfig.hasOwnProperty(addressKind)) {
        result += parseFloat(currencyFundConfig[addressKind]);
      }
    }

    return result;
  }
}

module.exports = FundDelta;
