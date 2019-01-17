'use strict';

/*
 * This module helps to confirm staking intent on CoGateway
 */

const rootPrefix = '../../..',
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  Base = require(rootPrefix + '/lib/stakeMintManagement/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  MerkleProof = require(rootPrefix + '/lib/stakeMintManagement/MerkleProofGenerator');

const MosaicFacilitator = require('@openstfoundation/mosaic-facilitator.js'),
  MosaicTbd = require('@openstfoundation/mosaic-tbd');

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
   * @param params.unlockSecret         {String} - Secret to generate hashLock
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
      return Promise.resolve(responseHelper.successWithData({ taskDone: 0, taskResponseData: JSON.stringify(response) }));
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

    console.log(response.data);
    oThis.storageProof = response.data.storageProof[0].serializedProof;
    oThis.rlpAccount = response.data.rlpAccount;
  }

  _fetchLastSyncedBlock(){
    const oThis = this;

    oThis.lastSyncedBlock = 407;
  }

  /**
   * _getHashLock
   *
   * @return {Promise<void>}
   * @private
   */
  async _getHashLock() {
    const oThis = this;

    let response = MosaicTbd.Helpers.StakeHelper.toHashLock(oThis.unlockSecret);

    return (response.hashLock);
  }

  /**
   * Perform Confirm stake intent on CoGateway
   *
   * @return {Promise<void>}
   * @private
   */
  async _performConfirmStakeIntent() {
    const oThis = this;

    let mosaicFacilitator = new MosaicFacilitator.CoGatewayHelper(oThis.auxWeb3, oThis.coGatewayContract, oThis.facilitator);

    let hashLock = await oThis._getHashLock(),
      txObject = await mosaicFacilitator._confirmStakeIntentRawTx(oThis.staker, oThis.stakerNonce,
        oThis.beneficiary, oThis.stakeAmount, oThis.gasPrice, oThis.gasLimit,
        hashLock, oThis.lastSyncedBlock, oThis.storageProof),
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
