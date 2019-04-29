'use strict';

/**
 * This class calculates token aux funder st prime requirement
 *
 * @module lib/calculateTokenAuxFunderSTPRequirement
 */
const rootPrefix = '..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  fundingAmounts = require(rootPrefix + '/config/funding'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress');

/**
 * Class to calculate token aux funder ST Prime requirement.
 *
 * @class CalculateTokenAuxFunderSTPRequirement
 */
class CalculateTokenAuxFunderSTPRequirement {
  /**
   * This function calculates token funder's st prime requirement.
   *
   * @returns {Object}
   */
  perform() {
    let maxBalanceToFund = basicHelper.convertToLowerUnit(String(0), coreConstants.ETH_CONVERSION_DECIMALS),
      thresholdBalance = basicHelper.convertToLowerUnit(String(0), coreConstants.ETH_CONVERSION_DECIMALS),
      tokenAuxFunderConfig = basicHelper.deepDup(fundingAmounts[tokenAddressConstants.auxFunderAddressKind].auxGas);

    for (let addressKind in tokenAuxFunderConfig) {
      let cardinality = addressKind == tokenAddressConstants.txWorkerAddressKind ? 4 : 1;

      maxBalanceToFund = maxBalanceToFund.plus(
        basicHelper
          .convertToLowerUnit(
            String(tokenAuxFunderConfig[addressKind].fundAmount),
            coreConstants.ETH_CONVERSION_DECIMALS
          )
          .mul(basicHelper.convertToBigNumber(cardinality))
      );
      thresholdBalance = thresholdBalance.plus(
        basicHelper
          .convertToLowerUnit(
            String(tokenAuxFunderConfig[addressKind].thresholdAmount),
            coreConstants.ETH_CONVERSION_DECIMALS
          )
          .mul(basicHelper.convertToBigNumber(cardinality))
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
