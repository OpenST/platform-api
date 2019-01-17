'use strict';

/*
 * This module helps to confirm staking intent on CoGateway
 */

const rootPrefix = '../../..',
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  Base = require(rootPrefix + '/lib/stakeMintManagement/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  BigNumber = require('bignumber.js'),
  util = require(rootPrefix + '/lib/util'),
  MerkleProof = require(rootPrefix + '/lib/stakeMintManagement/MerkleProofGenerator');

const MosaicFacilitator = require('@openstfoundation/mosaic-facilitator.js');

class ConfirmStakeIntentOnCoGateway extends Base {
  /**
   * @constructor
   *
   * @param params {Object}
   * @param params.auxChainId          {Number} - Aux chain Id to prove gateway on.
   * @param params.originChainId       {Number} - Origin chain Id to prove gateway of.
   * @param params.facilitator         {String} - Facilitator to help in signing the transaction.
   * @param params.staker              {String} - Staker Address to confirm stake operation.
   * @param params.stakerNonce         {String} - Staker Nonce on gateway
   * @param params.beneficiary         {String} - Beneficiary on Auxiliary chain
   * @param params.stakeAmount         {String} - Amount staked on Origin chain
   * @param params.gasPrice         {String} - Gas price to calculate bounty
   * @param params.gasLimit         {String} - Gas limit for bounty
   * @param params.secretString         {String} - Secret to generate hashLock
   * @param params.messageHash         {String} - Stake messageHash to generate storage proof.
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

    oThis._validateStakeAmount();

    await oThis._setWeb3Instance();

    await oThis._fetchContractAddresses();

    oThis._fetchLastSyncedBlock();

    await oThis._getMerkleProofForGateway();

    let response = await oThis._performConfirmStakeIntent();

    if (response.isSuccess()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskDone: 0,
          taskResponseData: { transactionHash: response.data.transactionHash }
        })
      );
    } else {
      return Promise.resolve(
        responseHelper.successWithData({ taskDone: 0, taskResponseData: JSON.stringify(response) })
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
      aux: [chainAddressConstants.auxCoGatewayContractKind],
      origin: [chainAddressConstants.originGatewayContractKind]
    };
  }

  /**
   * Validate stake amount
   *
   * @return {Promise<void>}
   * @private
   */
  _validateStakeAmount() {
    const oThis = this;

    oThis.stakeAmount = new BigNumber(oThis.stakeAmount);
    if (!oThis.stakeAmount) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_smm_s_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: { stakeAmount: 'Stake Amount is invalid' + oThis.stakeAmount }
        })
      );
    }
  }

  /**
   * _getMerkleProofForGateway
   *
   * @return {Promise<void>}
   * @private
   */
  async _getMerkleProofForGateway() {
    const oThis = this;

    let merkleProof = new MerkleProof({
      web3Instance: oThis.originWeb3,
      blockNumber: oThis.lastSyncedBlock,
      contractAddress: oThis.gatewayContract,
      messageHash: oThis.messageHash
    });

    let response = await merkleProof.perform();

    oThis.storageProof = response.data.storageProof[0].serializedProof;
    oThis.rlpAccount = response.data.rlpAccount;
  }

  _fetchLastSyncedBlock() {
    const oThis = this;

    oThis.lastSyncedBlock = 389;
  }

  /**
   * Perform Confirm stake intent on CoGateway
   *
   * @return {Promise<void>}
   * @private
   */
  async _performConfirmStakeIntent() {
    const oThis = this;

    let mosaicFacilitator = new MosaicFacilitator.CoGatewayHelper(
      oThis.auxWeb3,
      oThis.coGatewayContract,
      oThis.facilitator
    );

    let hashLock = util.generateHashLock(oThis.secretString).hashLock;

    let txObject = await mosaicFacilitator._confirmStakeIntentRawTx(
        oThis.staker,
        oThis.stakerNonce,
        oThis.beneficiary,
        oThis.stakeAmount.toString(10),
        oThis.gasPrice,
        oThis.gasLimit,
        hashLock,
        oThis.lastSyncedBlock,
        oThis.storageProof
      ),
      data = txObject.encodeABI();

    return oThis.performTransaction(
      oThis.auxChainId,
      oThis.auxWsProviders[0],
      oThis.facilitator,
      oThis.coGatewayContract,
      data
    );
  }
}

module.exports = ConfirmStakeIntentOnCoGateway;
