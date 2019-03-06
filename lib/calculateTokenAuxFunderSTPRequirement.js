'use strict';

/**
 * This class calculates token aux funder st prime requirement
 *
 * @type {string}
 */
const rootPrefix = '..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  fundingAmounts = require(rootPrefix + '/config/funding'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress');

/**
 * Class CalculateTokenAuxFunderSTPRequirement
 *
 */
class CalculateTokenAuxFunderSTPRequirement {
  /**
   * This function calculates token funder's st prime requirement.
   * @returns {Object}
   */
  perform() {
    const oThis = this;

    let maxBalanceToFund = basicHelper.convertToWei(String(0)),
      thresholdBalance = basicHelper.convertToWei(String(0)),
      tokenAuxFunderConfig = basicHelper.deepDup(fundingAmounts[tokenAddressConstants.auxFunderAddressKind].auxGas);

    for (let address in tokenAuxFunderConfig) {
      maxBalanceToFund = maxBalanceToFund.plus(
        basicHelper.convertToWei(String(tokenAuxFunderConfig[address].fundAmount))
      );
      thresholdBalance = thresholdBalance.plus(
        basicHelper.convertToWei(String(tokenAuxFunderConfig[address].thresholdAmount))
      );
    }

    let calculation = {
      [tokenAddressConstants.auxFunderAddressKind]: {
        maxBalanceToFundAtOneGwei: maxBalanceToFund.toString(10),
        thresholdBalanceAtOneGwei: thresholdBalance.toString(10)
      }
    };

    return calculation;
  }
}

module.exports = new CalculateTokenAuxFunderSTPRequirement();
