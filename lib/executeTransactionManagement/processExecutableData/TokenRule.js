'use strict';

/**
 *
 * @module lib/executeTransactionManagement/processExecutableData/TokenRule
 */

const BigNumber = require('bignumber.js');

const OpenStJs = require('@openstfoundation/openst.js'),
  TokenRulesHelper = OpenStJs.Helpers.TokenRules;

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
class TokenRule extends Base {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Object} params.rawCallData
   * @param {String} params.contractAddress
   * @param {String} params.tokenHolderAddress
   * @param {Object} params.web3Instance
   *
   * @constructor
   */
  constructor(params) {
    super(params);
  }

  /**
   * Validate executable data
   *
   * @private
   */
  async _validateExecutableData() {
    const oThis = this;

    if (!executableDataConstants.supportedMethodsForTokenRule.includes(oThis.rawCallDataMethod)) {
      return oThis._validationError('l_etm_ped_tr_1', ['invalid_executable_data'], {
        rawCallData: oThis.rawCallData
      });
    }

    if (
      !Array.isArray(oThis.rawCallDataParams) ||
      !CommonValidators.validateEthAddressArray(oThis.transferToAddresses) ||
      !CommonValidators.validateBigNumberArray(oThis.transferAmountsInBtWei) ||
      oThis.transferAmountsInBtWei.length !== oThis.transferToAddresses.length
    ) {
      return oThis._validationError('l_etm_ped_tr_2', ['invalid_executable_data'], {
        rawCallDataParameters: oThis.rawCallDataParams
      });
    }
  }

  /**
   * Set pessimistic debit amount
   *
   * @private
   */
  _setPessimisticDebitAmount() {
    const oThis = this;

    switch (oThis.rawCallDataMethod) {
      case executableDataConstants.directTransferMethod:
        for (let i = 0; i < oThis.transferAmountsInBtWei.length; i++) {
          oThis.pessimisticDebitAmount = oThis.pessimisticDebitAmount.add(
            new BigNumber(oThis.transferAmountsInBtWei[i])
          );
        }
        break;
      default:
        throw `unsupported rawCallDataMethod : ${oThis.rawCallDataMethod}`;
    }
  }

  /**
   * Set transfer executable data
   *
   * @private
   */
  _setTransferExecutableData() {
    const oThis = this;

    switch (oThis.rawCallDataMethod) {
      case executableDataConstants.directTransferMethod:
        oThis.transferExecutableData = new TokenRulesHelper(
          oThis.contractAddress,
          oThis.web3Instance
        ).getDirectTransferExecutableData(oThis.transferToAddresses, oThis.transferAmountsInBtWei);
        break;
      default:
        throw `unsupported rawCallDataMethod : ${oThis.rawCallDataMethod}`;
    }
  }

  /**
   * Set estimated transfers
   *
   * @private
   */
  _setEstimatedTransfers() {
    const oThis = this;

    switch (oThis.rawCallDataMethod) {
      case executableDataConstants.directTransferMethod:
        for (let i = 0; i < oThis.transferToAddresses.length; i++) {
          oThis.estimatedTransfers.push({
            fromAddress: oThis.tokenHolderAddress,
            toAddress: oThis.transferToAddresses[i],
            value: oThis.transferAmountsInBtWei[i]
          });
        }
        break;
      default:
        throw `unsupported rawCallDataMethod : ${oThis.rawCallDataMethod}`;
    }
  }

  /**
   * dependning on the number of transfers being performed in this tx, sets gas accordingly
   * @private
   */
  _setEstimatedGas() {
    const oThis = this;
    let transferGas = new BigNumber(contractConstants.executeTokenRulePerTransferGas).mul(
      oThis.transferToAddresses.length
    );
    let bnGas = new BigNumber(contractConstants.executeTokenRuleBaseGas).plus(transferGas);
    oThis.gas = basicHelper.formatWeiToString(bnGas);
  }

  get transferAmountsInBtWei() {
    const oThis = this;
    return oThis.rawCallDataParams[1];
  }

  get transferToAddresses() {
    const oThis = this;
    return oThis.rawCallDataParams[0];
  }
}

module.exports = TokenRule;
