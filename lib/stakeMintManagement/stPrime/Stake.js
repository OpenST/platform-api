'use strict';

/*
 * This file helps in performing stake
 *
 * lib/stakeMintManagement/Stake.js
 */

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  Base = require(rootPrefix + '/lib/stakeMintManagement/Base'),
  BigNumber = require('bignumber.js'),
  MosaicTbd = require('@openstfoundation/mosaic-tbd');

const uuid = require('uuid/v4');

class Stake extends Base {
  /**
   * @constructor
   *
   * @param params {Object}
   * @param params.originChainId   {Number}
   * @param params.auxChainId      {Number}
   * @param params.amountToStake   {Number}
   * @param params.beneficiary     {String}
   * @param params.stakerAddress   {String}
   *
   */
  constructor(params) {
    super(params);
  }

  /**
   * _asyncPerform
   *
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._setOriginWeb3Instance();

    await oThis._fetchContractAddresses();

    oThis._validateStakerAddress();

    oThis._validateStakeAmount();

    await oThis._getStakerNonceFromGateway();

    await oThis._getHashLock();

    let response = await oThis._performStake();

    if (response.isSuccess()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskDone: 0,
          transactionHash: response.data.transactionHash,
          taskResponseData: {
            transactionHash: response.data.transactionHash,
            secretString: oThis.secretString,
            chainId: oThis.originChainId,
            stakerNonce: oThis.stakerNonce
          }
        })
      );
    } else {
      return Promise.resolve(
        responseHelper.successWithData({
          taskDone: -1,
          taskResponseData: {
            err: JSON.stringify(response),
            secretString: oThis.secretString,
            chainId: oThis.originChainId,
            stakerNonce: oThis.stakerNonce
          }
        })
      );
    }
  }

  /**
   * _addressKindsToFetch
   *
   * @return {{origin: *[]}}
   * @private
   */
  _addressKindsToFetch() {
    const oThis = this;

    return {
      origin: [chainAddressConstants.originGatewayContractKind]
    };
  }

  /**
   * _validateStakerAddress - Validate staker address
   *
   * @return {Promise<void>}
   * @private
   */
  _validateStakerAddress() {
    const oThis = this;

    if (!oThis.stakerAddress) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_smm_s_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: { stakerAddress: oThis.stakerAddress }
        })
      );
    }
  }

  /**
   * Validate stake amount
   *
   * @return {Promise<void>}
   * @private
   */
  _validateStakeAmount() {
    const oThis = this;

    oThis.stakeAmount = new BigNumber(oThis.amountToStake);
    if (!oThis.stakeAmount) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_smm_s_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: { stakeAmount: 'Stake Amount is invalid' + oThis.amountToStake }
        })
      );
    }
  }

  /**
   * Get staker helper object
   */
  get _stakeHelperObject() {
    const oThis = this;

    if (!oThis.mosaicStakeHelper) {
      oThis.mosaicStakeHelper = new MosaicTbd.Helpers.StakeHelper();
    }

    return oThis.mosaicStakeHelper;
  }

  /**
   * _getStakerNonceFromGateway
   *
   * @return {Promise<void>}
   * @private
   */
  async _getStakerNonceFromGateway() {
    const oThis = this;

    oThis.stakerNonce = await oThis._stakeHelperObject.getNonce(
      oThis.stakerAddress,
      oThis.originWeb3,
      oThis.gatewayContract
    );
  }

  /**
   * _getHashLock
   *
   * @return {Promise<void>}
   * @private
   */
  async _getHashLock() {
    const oThis = this;

    let response = MosaicTbd.Helpers.StakeHelper.createSecretHashLock();

    oThis.secretString = response.secret;
    oThis.hashLock = response.hashLock;
  }

  /**
   * _performStake - Invoke stake
   *
   * @return {Promise<void>}
   * @private
   */
  async _performStake() {
    const oThis = this;

    // These Gas prices would be used for Rewards after MVP
    let gasPrice = '0',
      gasLimit = '0',
      txObject = oThis._stakeHelperObject._stakeRawTx(
        oThis.stakeAmount.toString(10),
        oThis.beneficiary,
        gasPrice,
        gasLimit,
        oThis.stakerNonce,
        oThis.hashLock,
        {},
        oThis.originWeb3,
        oThis.gatewayContract,
        oThis.stakerAddress
      );

    let data = txObject.encodeABI();

    return oThis.performTransaction(
      oThis.originChainId,
      oThis.originWsProviders[0],
      oThis.stakerAddress,
      oThis.gatewayContract,
      data
    );
  }
}

module.exports = Stake;
