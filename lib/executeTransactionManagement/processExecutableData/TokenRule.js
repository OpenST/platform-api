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
   * @param {Object} params.executableData
   * @param {Object} params.contractAddress
   * @param {Object} params.web3Instance
   *
   * @constructor
   */
  constructor(params) {
    super(params);
  }

  /**
   *
   * @private
   */
  async _validateExecutableData() {
    const oThis = this;

    if (!executableDataConstants.supportedMethodsForTokenRule.includes(oThis.rawCallDataMethod)) {
      return oThis._validationError('l_etm_ped_b_1', ['invalid_executable_data'], {
        rawCallData: oThis.rawCallData
      });
    }

    if (
      !Array.isArray(oThis.rawCallDataParams) ||
      !CommonValidators.validateEthAddressArray(oThis.tokenRuleTransferToAddresses) ||
      !CommonValidators.validateBigNumberArray(oThis.tokenRuleTransferAmounts) ||
      oThis.tokenRuleTransferAmounts.length !== oThis.tokenRuleTransferToAddresses.length
    ) {
      return oThis._validationError('l_etm_ped_b_2', ['invalid_executable_data'], {
        rawCallDataParameters: oThis.rawCallDataParams
      });
    }
  }

  _setPessimisticDebitAmount() {
    const oThis = this;

    switch (oThis.rawCallDataMethod) {
      case executableDataConstants.directTransferMethod:
        for (let i = 0; i < oThis.tokenRuleTransferAmounts.length; i++) {
          oThis.pessimisticDebitAmount = oThis.pessimisticDebitAmount.add(
            new BigNumber(oThis.tokenRuleTransferAmounts[i])
          );
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
  _setTransferExecutableData() {
    const oThis = this;

    switch (oThis.rawCallDataMethod) {
      case executableDataConstants.directTransferMethod:
        oThis.transferExecutableData = new TokenRulesHelper(
          oThis.contractAddress,
          oThis.web3Instance
        ).getDirectTransferExecutableData(oThis.tokenRuleTransferToAddresses, oThis.tokenRuleTransferAmounts);
        break;
      default:
        throw `unsupported rawCallDataMethod : ${oThis.rawCallDataMethod}`;
    }
  }

  get tokenRuleTransferAmounts() {
    const oThis = this;
    return oThis.rawCallDataParams[1];
  }

  get tokenRuleTransferToAddresses() {
    const oThis = this;
    return oThis.rawCallDataParams[0];
  }
}

module.exports = TokenRule;
