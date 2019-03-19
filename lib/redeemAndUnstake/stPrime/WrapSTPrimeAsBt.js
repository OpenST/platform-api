'use strict';
/*
 * This file Wraps ST Prime as BT to perform operations of Redeem.
 *
 * @module lib/redeemAndUnstake/stPrime/WrapSTPrimeAsBt
 */
const BigNumber = require('bignumber.js');

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  CommonValidator = require(rootPrefix + '/lib/validators/Common'),
  ContractInteractLayer = require(rootPrefix + '/lib/redeemAndUnstake/ContractInteractLayer'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  RedeemBase = require(rootPrefix + '/lib/redeemAndUnstake/Base');

class WrapSTPrimeAsBt extends RedeemBase {
  /**
   * @constructor
   *
   * @param params
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.originChainId = params.originChainId;
    oThis.auxChainId = params.auxChainId;
    oThis.redeemerAddress = params.redeemerAddress;
    oThis.amountToRedeem = params.amountToRedeem;
    oThis.beneficiary = params.beneficiary;

    oThis.stPrimeContractAddress = null;
  }

  /**
   * _asyncPerform
   *
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._validate();

    await oThis._setAuxWeb3Instance();

    let response = await oThis._performWrapTransaction();

    if (response.isSuccess()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskPending,
          transactionHash: response.data.transactionHash,
          taskResponseData: {
            transactionHash: response.data.transactionHash,
            chainId: oThis.auxChainId
          }
        })
      );
    } else {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskFailed,
          taskResponseData: {
            transactionHash: response.data.transactionHash,
            chainId: oThis.auxChainId
          }
        })
      );
    }
  }

  /**
   * Validate Data
   *
   * @returns {Promise<void>}
   * @private
   */
  async _validate() {
    const oThis = this;

    if (!CommonValidator.validateEthAddress(oThis.redeemerAddress)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_rau_stp_wst_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { redeemerAddress: oThis.redeemerAddress }
        })
      );
    }

    if (!CommonValidator.validateNonZeroWeiValue(oThis.amountToRedeem)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_smm_s_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: { amountToRedeem: 'Redeem Amount is invalid' + oThis.amountToRedeem }
        })
      );
    }

    oThis.amountToRedeem = new BigNumber(oThis.amountToRedeem).toString(10);
  }

  /**
   * Fetch ST Prime contract address
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchStPrimeContract() {
    const oThis = this;

    // Fetch StPrime contract address
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    return chainAddressesRsp.data[chainAddressConstants.stPrimeContractKind].address;
  }

  /**
   * Get wrap data to be submitted in transaction.
   *
   * @returns {Promise<any>}
   * @private
   */
  async _getWrapData() {
    const oThis = this;

    oThis.stPrimeContractAddress = await oThis._fetchStPrimeContract();

    return ContractInteractLayer.getWrapData(oThis.auxWeb3, oThis.stPrimeContractAddress);
  }

  /**
   * Perform wrap st prime as BT transaction
   *
   * @returns {Promise<void>}
   * @private
   */
  async _performWrapTransaction() {
    const oThis = this;

    let data = await oThis._getWrapData(),
      txOptions = {
        gasPrice: contractConstants.auxChainGasPrice,
        gas: contractConstants.wrapStPrimeGas,
        value: oThis.amountToRedeem
      };

    return oThis.performTransaction(
      oThis.auxChainId,
      oThis.shuffledProviders[oThis.auxChainId][0],
      oThis.redeemerAddress,
      oThis.stPrimeContractAddress,
      txOptions,
      data
    );
  }
}

module.exports = WrapSTPrimeAsBt;
