'use strict';
/**
 * This module helps to confirm staking intent on CoGateway
 *
 * @module lib/stakeAndMint/common/ConfirmStakeIntentBase
 */
const BigNumber = require('bignumber.js'),
  MosaicFacilitator = require('@openstfoundation/mosaic-facilitator.js');

const rootPrefix = '../../..',
  util = require(rootPrefix + '/lib/util'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  StateRootCommitModel = require(rootPrefix + '/app/models/mysql/StateRootCommit'),
  StakeAndMintBase = require(rootPrefix + '/lib/stakeAndMint/Base'),
  MerkleProof = require(rootPrefix + '/lib/stakeAndMint/common/MerkleProofGenerator');

class ConfirmStakeIntentOnCoGateway extends StakeAndMintBase {
  /**
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.originChainId = params.originChainId;

    oThis.amountMinted = params.amountMinted;
    oThis.messageHash = params.messageHash;
    oThis.stakerAddress = params.stakerAddress;
    oThis.facilitator = params.facilitator;
    oThis.secretString = params.secretString;
    oThis.stakerNonce = params.stakerNonce;
    oThis.beneficiary = params.beneficiary;
    oThis.gasPrice = params.gasPrice;
    oThis.gasLimit = params.gasLimit;

    oThis.gatewayContract = null;
    oThis.coGatewayContract = null;
    oThis.storageProof = null;
    oThis.rlpAccount = null;
    oThis.lastSyncedBlock = null;
  }

  /**
   * Async performer
   *
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._validateStakeAmount();

    await oThis._setWeb3Instance();

    await oThis._fetchGatewayAddresses();

    await oThis._fetchLastSyncedBlock();

    await oThis._getMerkleProofForGateway();

    let response = await oThis._performConfirmStakeIntent();

    if (response.isSuccess()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskPending,
          transactionHash: response.data.transactionHash,
          taskResponseData: { chainId: oThis.auxChainId, transactionHash: response.data.transactionHash }
        })
      );
    } else {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskPending,
          taskResponseData: JSON.stringify(response)
        })
      );
    }
  }

  /**
   * Validate stake amount
   *
   * @return {Promise<void>}
   *
   * @private
   */
  _validateStakeAmount() {
    const oThis = this;

    if (!oThis.amountMinted) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_smm_s_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: { amountMinted: 'Minted Amount is invalid' + oThis.amountMinted }
        })
      );
    }

    oThis.amountMinted = new BigNumber(oThis.amountMinted);
  }

  /**
   * Get merkle proof for gateway
   *
   * @return {Promise<void>}
   *
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
   * Fetch last synced block.
   *
   * @return {Promise<void>}
   *
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
   * Decide Staker in the transaction
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _getStakerAddress() {
    const oThis = this;

    // In case of BT Gateway Composer would be staker.
    if (oThis.tokenId) {
      await oThis._fetchStakerGatewayComposer();
      return Promise.resolve(oThis.gatewayComposer);
    } else {
      return Promise.resolve(oThis.stakerAddress);
    }
  }

  /**
   * Perform Confirm stake intent on CoGateway
   *
   * @return {Promise<void>}
   *
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

    let staker = await oThis._getStakerAddress();

    let txObject = await mosaicFacilitator._confirmStakeIntentRawTx(
        staker,
        oThis.stakerNonce,
        oThis.beneficiary,
        oThis.amountMinted.toString(10),
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

  /**
   * Fetch gateway addresses
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchGatewayAddresses() {
    throw 'sub-class to implement';
  }
}

module.exports = ConfirmStakeIntentOnCoGateway;
