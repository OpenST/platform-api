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
    oThis.bNostInBt = null;
    oThis.bNostInUsd = null;
    oThis.bNostInUsdinWei = null;
    oThis.bNTransferAmountsinBtWei = [];
  }

  /**
   *
   * @private
   */
  async _validateExecutableData() {
    const oThis = this;

    if (
      !executableDataConstants.supportedMethodsForPricerRule.includes(oThis.rawCallDataMethod) ||
      !Array.isArray(oThis.rawCallDataParams) ||
      oThis.rawCallDataParams.length !== 5 ||
      oThis.transferAmountsinUsdWei.length !== oThis.transferToAddresses.length
    ) {
      return oThis._validationError('l_etm_ped_pr_1', ['invalid_raw_calldata'], {
        rawCallDataParameters: oThis.rawCallDataParams
      });
    }

    if (oThis.tokenHolderAddressFromRawCallData !== oThis.tokenHolderAddress) {
      return oThis._validationError('l_etm_ped_pr_2', ['invalid_raw_calldata'], {
        rawCallDataParameters: oThis.rawCallDataParams
      });
    }

    if (
      !CommonValidators.validateEthAddressArray(oThis.transferToAddresses) ||
      oThis.transferToAddresses.includes(oThis.tokenHolderAddressFromRawCallData)
    ) {
      return oThis._validationError('l_etm_ped_pr_3', ['invalid_raw_calldata_parameter_address'], {
        rawCallDataParameters: oThis.rawCallDataParams
      });
    }

    if (!CommonValidators.validateWeiAmountArray(oThis.transferAmountsinUsdWei)) {
      return oThis._validationError('l_etm_ped_pr_4', ['invalid_raw_calldata_parameter_amount'], {
        rawCallDataParameters: oThis.rawCallDataParams
      });
    }

    if (oThis.payCurrencyCodeFromRawCallData !== contractConstants.payCurrencyCode) {
      return oThis._validationError('l_etm_ped_pr_5', ['invalid_raw_calldata_pay_currency_code'], {
        rawCallDataParameters: oThis.rawCallDataParams
      });
    }

    if (!CommonValidators.validateString(oThis.ostToUsdInWeiFromRawCallData)) {
      //TODO: Implement tolerance from current OSt in usd value
      return oThis._validationError('l_etm_ped_pr_6', ['invalid_raw_calldata_ost_to_usd_value'], {
        rawCallDataParameters: oThis.rawCallDataParams
      });
    }
  }

  /**
   *
   * @private
   */
  async _setPessimisticDebitAmount() {
    const oThis = this;

    oThis.bNostInBt = new BigNumber(oThis.ostInBt);

    oThis.bNostInUsdinWei = new BigNumber(oThis.ostToUsdInWeiFromRawCallData);

    oThis.bNostInUsd = basicHelper.convertWeiToNormal(oThis.bNostInUsdinWei);

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
          oThis.tokenHolderAddressFromRawCallData,
          oThis.transferToAddresses,
          oThis.transferAmountsinUsdWei,
          oThis.payCurrencyCodeFromRawCallData,
          oThis.ostToUsdInWeiFromRawCallData
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
            fromAddress: oThis.tokenHolderAddressFromRawCallData,
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

  get tokenHolderAddressFromRawCallData() {
    const oThis = this;
    return oThis.rawCallDataParams[0];
  }

  get transferToAddresses() {
    const oThis = this;
    return oThis.rawCallDataParams[1];
  }

  get transferAmountsinUsdWei() {
    const oThis = this;
    return oThis.rawCallDataParams[2];
  }

  get payCurrencyCodeFromRawCallData() {
    const oThis = this;
    return oThis.rawCallDataParams[3];
  }

  get ostToUsdInWeiFromRawCallData() {
    const oThis = this;
    return oThis.rawCallDataParams[4];
  }
}

module.exports = PricerRule;
