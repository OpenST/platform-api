'use strict';
/*
 * This file helps in performing stake
 *
 * lib/stakeAndMint/stPrime/Stake
 */
const BigNumber = require('bignumber.js'),
  MosaicTbd = require('@openstfoundation/mosaic-tbd');

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  StakeAndMintBase = require(rootPrefix + '/lib/stakeAndMint/Base');

class Stake extends StakeAndMintBase {
  /**
   * @constructor
   *
   * @param params
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.originChainId = params.originChainId;
    oThis.stakerAddress = params.stakerAddress;
    oThis.amountToStake = params.amountToStake;
    oThis.beneficiary = params.beneficiary;

    oThis.secretString = null;
    oThis.stakerNonce = null;
    oThis.hashLock = null;
    oThis.gatewayContract = null;
    oThis.mosaicStakeHelper = null;
  }

  /**
   * _asyncPerform
   *
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._setOriginWeb3Instance();

    await oThis._fetchGatewayAddress();

    oThis._validateStakerAddress();

    oThis._validateStakeAmount();

    await oThis._getStakerNonceFromGateway();

    await oThis._getHashLock();

    let response = await oThis._performStake();

    if (response.isSuccess()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskPending,
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
          taskStatus: workflowStepConstants.taskFailed,
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
   * Fetch gateway address
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchGatewayAddress() {
    const oThis = this;

    // Fetch gateway contract address
    let params = {
      chainId: oThis.originChainId,
      auxChainId: oThis.auxChainId,
      kind: chainAddressConstants.originGatewayContractKind
    };

    let response = await new ChainAddressModel().fetchAddress(params);

    oThis.gatewayContract = response.data.address;
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

    if (!oThis.amountToStake) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_smm_s_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: { amountToStake: 'Stake Amount is invalid' + oThis.amountToStake }
        })
      );
    }

    oThis.amountToStake = new BigNumber(oThis.amountToStake);
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
        oThis.amountToStake.toString(10),
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
