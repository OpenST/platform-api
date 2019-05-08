/*
 * This file helps in converting stake currency amount to bt amount and vice versa.
 */
const rootPrefix = '..',
  basicHelper = require(rootPrefix + '/helpers/basic.js');

/**
 * Class to calculate stake currency to bt amount and vice versa.
 *
 * @class StakeCurrencyBTConverter
 */
class StakeCurrencyBTConverter {
  /**
   * constructor
   *
   * @param {Object} params
   * @param {Number} params.conversionFactor: Conversion factor (1 OST to how many BT)
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.conversionFactor = params.conversionFactor;
  }

  /**
   * This function converts stake currency amount in wei to BT amount in wei.
   *
   * @param stakeCurrencyAmountInWei
   * @returns {string} bt amount in wei
   */
  convertStakeCurrencyToBT(stakeCurrencyAmountInWei) {
    const oThis = this;

    let conversionFactorBN = basicHelper.convertToBigNumber(oThis.conversionFactor),
      stakeCurrencyAmountBN = basicHelper.convertToBigNumber(stakeCurrencyAmountInWei),
      computedBtAmountBN = stakeCurrencyAmountBN.mul(conversionFactorBN),
      computedBtAmountStr = basicHelper.formatWeiToString(computedBtAmountBN),
      // as contract always floor's the number. applying a custom logic
      truncatedComputedBtAmountStr = computedBtAmountStr.split('.')[0];

    return basicHelper.formatWeiToString(truncatedComputedBtAmountStr);
  }

  /**
   * This function converts BT amount in wei to stake currency amount in wei.
   *
   * @param stakeCurrencyAmountInWei
   * @returns {string} stake currency amount in wei
   */
  convertBtToStakeCurrency(btAmountInWei) {
    const oThis = this;

    let conversionFactorBN = basicHelper.convertToBigNumber(oThis.conversionFactor),
      btAmountBN = basicHelper.convertToBigNumber(btAmountInWei),
      computedStakeCurrencyAmountBN = btAmountBN.div(conversionFactorBN),
      computedStakeCurrencyAmountStr = basicHelper.formatWeiToString(computedStakeCurrencyAmountBN),
      // as contract always floor's the number. applying a custom logic
      truncatedComputedStakeAmountStr = computedStakeCurrencyAmountStr.split('.')[0];

    return basicHelper.formatWeiToString(truncatedComputedStakeAmountStr);
  }
}

module.exports = StakeCurrencyBTConverter;
