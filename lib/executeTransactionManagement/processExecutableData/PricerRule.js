'use strict';

/**
 *
 * @module lib/executeTransactionManagement/processExecutableData/PricerRule
 */

const BigNumber = require('bignumber.js');

const OpenSTJs = require('@openstfoundation/openst.js'),
  PricerRuleHelper = OpenSTJs.Helpers.Rules.PricerRule;

const rootPrefix = '../../..',
  Base = require(rootPrefix + '/lib/executeTransactionManagement/processExecutableData/Base'),
  executableDataConstants = require(rootPrefix + '/lib/globalConstant/executableData'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  PricePointsCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/OstPricePoint'),
  conversionRateConstants = require(rootPrefix + '/lib/globalConstant/conversionRates'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common');

/**
 * Class
 *
 * @class
 */
class PricerRule extends Base {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Object} params.rawCallData
   * @param {String} params.contractAddress
   * @param {String} params.tokenHolderAddress
   * @param {Number} params.auxChainId
   * @param {Float} params.conversionFactor
   * @param {Object} params.web3Instance
   *
   * @constructor
   */
  constructor(params) {
    super(params);
    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.ostInBt = params.conversionFactor;
    oThis.ostInUsd = null;
    oThis.bNostInBt = null;
    oThis.bNostInUsd = null;
    oThis.bNTransferAmountsinBtWei = [];
  }

  /**
   *
   * @private
   */
  async _validateExecutableData() {
    const oThis = this;

    if (!executableDataConstants.supportedMethodsForPricerRule.includes(oThis.rawCallDataMethod)) {
      return oThis._validationError('l_etm_ped_pr_1', ['invalid_raw_calldata'], {
        rawCallData: oThis.rawCallData
      });
    }

    if (
      !Array.isArray(oThis.rawCallDataParams) ||
      !CommonValidators.validateEthAddressArray(oThis.transferToAddresses) ||
      !CommonValidators.validateBigNumberArray(oThis.transferAmountsinUsdWei) ||
      !CommonValidators.validateWeiAmountArray(oThis.transferAmountsinUsdWei) ||
      oThis.transferAmountsinUsdWei.length !== oThis.transferToAddresses.length
    ) {
      return oThis._validationError('l_etm_ped_b_2', ['invalid_raw_calldata'], {
        rawCallDataParameters: oThis.rawCallDataParams
      });
    }
  }

  /**
   *
   * @private
   */
  async _setPricePoints() {
    const oThis = this;

    let pricePointsCacheObj = new PricePointsCache({ chainId: oThis.auxChainId }),
      pricePointsResponse = await pricePointsCacheObj.fetch();

    if (pricePointsResponse.isFailure()) {
      return Promise.reject(pricePointsResponse);
    }

    oThis.ostInUsd = pricePointsResponse.data[conversionRateConstants.OST][conversionRateConstants.USD];

    if (!oThis.ostInUsd) {
      return Promise.reject(pricePointsResponse);
    }

    oThis.bNostInBt = new BigNumber(oThis.ostInBt);
    oThis.bNostInUsd = new BigNumber(oThis.ostInUsd);
  }

  /**
   *
   * @private
   */
  async _setPessimisticDebitAmount() {
    const oThis = this;

    await oThis._setPricePoints();

    await oThis._setTransferAmountsInBTWei();

    switch (oThis.rawCallDataMethod) {
      case executableDataConstants.payMethod:
        for (let i = 0; i < oThis.bNTransferAmountsinBtWei.length; i++) {
          oThis.pessimisticDebitAmount = oThis.pessimisticDebitAmount.add(oThis.bNTransferAmountsinBtWei[i]);
        }
        oThis.pessimisticDebitAmount = oThis.pessimisticDebitAmount.round();
        break;
      default:
        throw `unsupported rawCallDataMethod : ${oThis.rawCallDataMethod}`;
    }
  }

  /**
   *
   * @private
   */
  _setTransferExecutableData() {
    const oThis = this;

    switch (oThis.rawCallDataMethod) {
      case executableDataConstants.payMethod:
        oThis.transferExecutableData = new PricerRuleHelper(
          oThis.web3Instance,
          oThis.contractAddress
        ).getPayExecutableData(
          oThis.tokenHolderAddress,
          oThis.transferToAddresses,
          oThis.transferAmountsinUsdWei,
          contractConstants.payCurrencyCode,
          basicHelper.formatWeiToString(basicHelper.convertToWei(oThis.ostInUsd))
        );
        break;
      default:
        throw `unsupported rawCallDataMethod : ${oThis.rawCallDataMethod}`;
    }
  }

  /**
   *
   * @private
   */
  _setEstimatedTransfers() {
    const oThis = this;

    switch (oThis.rawCallDataMethod) {
      case executableDataConstants.payMethod:
        for (let i = 0; i < oThis.transferToAddresses.length; i++) {
          oThis.estimatedTransfers.push({
            fromAddress: oThis.tokenHolderAddress,
            toAddress: oThis.transferToAddresses[i],
            value: basicHelper.formatWeiToString(oThis.bNTransferAmountsinBtWei[i])
          });
        }
        break;
      default:
        throw `unsupported rawCallDataMethod : ${oThis.rawCallDataMethod}`;
    }
  }

  /**
   *
   * @private
   */
  _setTransferAmountsInBTWei() {
    const oThis = this;

    let transferAmountsinUsdWei = oThis.transferAmountsinUsdWei;

    for (let i = 0; i < transferAmountsinUsdWei.length; i++) {
      oThis.bNTransferAmountsinBtWei[i] = oThis._convertToBtWei(transferAmountsinUsdWei[i]);
    }
  }

  /**
   *
   * @param {String} amountinUsdWei
   * @return {Bignumber}
   * @private
   */
  _convertToBtWei(amountinUsdWei) {
    const oThis = this;

    return new BigNumber(amountinUsdWei).mul(oThis.bNostInBt).div(oThis.bNostInUsd);
  }

  /**
   * dependning on the number of transfers being performed in this tx, sets gas accordingly
   * @private
   */
  _setEstimatedGas() {
    const oThis = this;
    let transferGas = new BigNumber(contractConstants.executePricerRuleBaseGas).mul(oThis.transferToAddresses.length);
    let bnGas = new BigNumber(contractConstants.executePricerRulePerTransferGas).plus(transferGas);
    oThis.gas = basicHelper.formatWeiToString(bnGas);
  }

  get transferAmountsinUsdWei() {
    const oThis = this;
    return oThis.rawCallDataParams[1];
  }

  get transferToAddresses() {
    const oThis = this;
    return oThis.rawCallDataParams[0];
  }
}

module.exports = PricerRule;
