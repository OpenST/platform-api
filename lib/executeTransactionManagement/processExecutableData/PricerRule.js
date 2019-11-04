'use strict';

/**
 *
 * @module lib/executeTransactionManagement/processExecutableData/PricerRule
 */

const BigNumber = require('bignumber.js');

const OpenSTJs = require('@openst/openst.js'),
  PricerRuleHelper = OpenSTJs.Helpers.Rules.PricerRule;

const rootPrefix = '../../..',
  Base = require(rootPrefix + '/lib/executeTransactionManagement/processExecutableData/Base'),
  executableDataConstants = require(rootPrefix + '/lib/globalConstant/executableData'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  PricePointsGet = require(rootPrefix + '/app/services/chain/PricePoints'),
  StakeCurrencyByIdCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyById'),
  AllQuoteCurrencySymbols = require(rootPrefix + '/lib/cacheManagement/shared/AllQuoteCurrencySymbols'),
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
   * @param {Object} params.token
   * @param {Object} params.web3Instance
   *
   * @constructor
   */
  constructor(params) {
    super(params);
    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.tokenId = params.token.id;
    oThis.stakeCurrencyInBt = params.token.conversionFactor;
    oThis.stakeCurrencyId = params.token.stakeCurrencyId;
    oThis.stakeCurrencyData = null;
    oThis.bNStakeCurrencyInBt = null;
    oThis.bNStakeCurrencyInUsd = null;
    oThis.bNStakeCurrencyInUsdWei = null;
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
      oThis.transferAmountsinUsdWei.length !== oThis.transferToAddresses.length ||
      oThis.transferToAddresses.length > contractConstants.maxAllowedTransfersForExecuteRule
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

    if (!CommonValidators.validateEthAddressArray(oThis.transferToAddresses)) {
      return oThis._validationError('l_etm_ped_pr_3', ['invalid_raw_calldata_parameter_address'], {
        rawCallDataParameters: oThis.rawCallDataParams
      });
    }

    if (!CommonValidators.validateWeiAmountArray(oThis.transferAmountsinUsdWei)) {
      return oThis._validationError('l_etm_ped_pr_4', ['invalid_raw_calldata_parameter_amount'], {
        rawCallDataParameters: oThis.rawCallDataParams
      });
    }

    let allQuoteCurrencySymbols = new AllQuoteCurrencySymbols({});

    let cacheRsp = await allQuoteCurrencySymbols.fetch();

    oThis.quoteCurrencies = cacheRsp.data;

    if (!oThis.quoteCurrencies.includes(oThis.payCurrencyCodeFromRawCallData)) {
      return oThis._validationError('l_etm_ped_pr_5', ['invalid_raw_calldata_pay_currency_code'], {
        rawCallDataParameters: oThis.rawCallDataParams
      });
    }

    await oThis._validateStakeCurrencyToUsdPrice();
  }

  /**
   *
   * @private
   */
  async _validateStakeCurrencyToUsdPrice() {
    const oThis = this;

    if (!CommonValidators.validateNonZeroWeiValue(oThis.stakeCurrencyToUsdInWeiFromRawCallData)) {
      return oThis._validationError('l_etm_ped_pr_6', ['invalid_raw_calldata_stake_currency_to_usd_value'], {
        rawCallDataParameters: oThis.rawCallDataParams
      });
    }

    oThis.bNStakeCurrencyInUsdWei = new BigNumber(oThis.stakeCurrencyToUsdInWeiFromRawCallData);

    let stakeCurrencyCacheResponse = await new StakeCurrencyByIdCache({
      stakeCurrencyIds: [oThis.stakeCurrencyId]
    }).fetch();

    if (stakeCurrencyCacheResponse.isFailure()) {
      return Promise.reject(stakeCurrencyCacheResponse);
    }

    oThis.stakeCurrencyData = stakeCurrencyCacheResponse.data[oThis.stakeCurrencyId];

    let pricePointsGetRsp = await new PricePointsGet({
      chain_id: oThis.auxChainId,
      token_id: oThis.tokenId
    }).perform();

    let decimals = pricePointsGetRsp.data.decimals,
      stakeCurrencyInUsdFromCache =
        pricePointsGetRsp.data[oThis.stakeCurrencyData['symbol']][oThis.payCurrencyCodeFromRawCallData],
      bnStakeCurrencyInUsdInWeiFromCache = new BigNumber(stakeCurrencyInUsdFromCache).mul(
        new BigNumber(10).toPower(decimals)
      ),
      acceptedMargin = contractConstants.acceptanceMargin;

    let diff = bnStakeCurrencyInUsdInWeiFromCache.minus(oThis.bNStakeCurrencyInUsdWei);

    if (diff.lt(0)) {
      diff = diff.mul(new BigNumber(-1));
    }

    if (diff.gt(acceptedMargin)) {
      return oThis._validationError('l_etm_ped_pr_7', ['invalid_raw_calldata_stake_currency_to_usd_value'], {
        acceptedMargin: acceptedMargin,
        diff: diff,
        stakeCurrencyToUsdInWeiFromRawCallData: oThis.stakeCurrencyToUsdInWeiFromRawCallData,
        bnStakeCurrencyInUsdInWeiFromCache: bnStakeCurrencyInUsdInWeiFromCache.toString(10)
      });
    }
  }

  /**
   *
   * @private
   */
  async _setPessimisticDebitAmount() {
    const oThis = this;

    oThis.bNStakeCurrencyInBt = new BigNumber(oThis.stakeCurrencyInBt);

    oThis.bNStakeCurrencyInUsd = basicHelper.convertLowerUnitToNormal(
      oThis.bNStakeCurrencyInUsdWei,
      coreConstants.USD_DECIMALS
    );

    await oThis._setTransferAmountsInBTWei();

    switch (oThis.rawCallDataMethod) {
      case executableDataConstants.payMethod:
        for (let i = 0; i < oThis.bNTransferAmountsinBtWei.length; i++) {
          oThis.pessimisticDebitAmount = oThis.pessimisticDebitAmount.add(oThis.bNTransferAmountsinBtWei[i]);
        }
        // Since contract floors the decimal value of BT weis
        oThis.pessimisticDebitAmount = oThis.pessimisticDebitAmount.floor();
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
          oThis.stakeCurrencyToUsdInWeiFromRawCallData
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
        for (let i = 0; i < oThis.sanitizedToAddresses.length; i++) {
          oThis.estimatedTransfers.push({
            fromAddress: oThis.tokenHolderAddress,
            toAddress: oThis.sanitizedToAddresses[i],
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

    let btInWei = new BigNumber(amountinUsdWei).mul(oThis.bNStakeCurrencyInBt).div(oThis.bNStakeCurrencyInUsd);

    // removing the 10^18 multiplied for USD wei conversion
    let btInNormal = basicHelper.convertLowerUnitToNormal(btInWei, coreConstants.USD_DECIMALS);

    return basicHelper.convertToLowerUnit(btInNormal, oThis.stakeCurrencyData['decimal']).floor();
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
    return basicHelper.sanitizeAddress(oThis.rawCallDataParams[0] || '');
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

  get stakeCurrencyToUsdInWeiFromRawCallData() {
    const oThis = this;
    return oThis.rawCallDataParams[4];
  }
}

module.exports = PricerRule;
