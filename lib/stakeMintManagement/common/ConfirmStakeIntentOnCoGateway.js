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
  StateRootCommitModel = require(rootPrefix + '/app/models/mysql/StateRootCommit'),
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
   * @param params.stakerAddress              {String} - Staker Address to confirm stake operation.
   * @param params.stakerNonce         {String} - Staker Nonce on gateway
   * @param params.beneficiary         {String} - Beneficiary on Auxiliary chain
   * @param params.amountToStake         {String} - Amount staked on Origin chain
   * @param params.gasPrice         {String} - Gas price to calculate reward
   * @param params.gasLimit         {String} - Gas limit for reward
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

    await oThis._fetchLastSyncedBlock();

    await oThis._getMerkleProofForGateway();

    let response = await oThis._performConfirmStakeIntent();

    if (response.isSuccess()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskDone: 0,
          transactionHash: response.data.transactionHash,
          taskResponseData: { chainId: oThis.auxChainId, transactionHash: response.data.transactionHash }
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

    oThis.amountToStake = new BigNumber(oThis.amountToStake);
    if (!oThis.amountToStake) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_smm_s_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: { amountToStake: 'Stake Amount is invalid' + oThis.amountToStake }
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

  /**
   * _fetchLastSyncedBlock
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchLastSyncedBlock() {
    const oThis = this;

    let stateRootCommitModel = new StateRootCommitModel();

    let resp = await stateRootCommitModel.getLastSyncedBlock({
      source_chain_id: oThis.originChainId,
      target_chain_id: oThis.auxChainId
    });

    oThis.lastSyncedBlock = resp[0].block_number;
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
        oThis.stakerAddress,
        oThis.stakerNonce,
        oThis.beneficiary,
        oThis.amountToStake.toString(10),
        oThis.gasPrice || '0',
        oThis.gasLimit || '0',
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
