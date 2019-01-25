'use strict';
/**
 * This module helps to confirm staking intent on CoGateway
 *
 * @module lib/stakeMintManagement/common/ConfirmStakeIntentOnCoGateway
 */
const BigNumber = require('bignumber.js'),
  MosaicFacilitator = require('@openstfoundation/mosaic-facilitator.js'),
  BrandedToken = require('@openstfoundation/branded-token.js');

const rootPrefix = '../../..',
  util = require(rootPrefix + '/lib/util'),
  Base = require(rootPrefix + '/lib/stakeMintManagement/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  StateRootCommitModel = require(rootPrefix + '/app/models/mysql/StateRootCommit'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  MerkleProof = require(rootPrefix + '/lib/stakeMintManagement/MerkleProofGenerator');

class ConfirmStakeIntentOnCoGateway extends Base {
  /**
   * @param {Object} params
   * @param {Number} params.auxChainId: Aux chain Id to prove gateway on.
   * @param {Number} params.originChainId: Origin chain Id to prove gateway of.
   * @param {String} params.facilitator: Facilitator to help in signing the transaction.
   * @param {String} params.stakerAddress: Staker Address to confirm stake operation.
   * @param {String} params.stakerNonce: Staker Nonce on gateway
   * @param {String} params.beneficiary: Beneficiary on Auxiliary chain
   * @param {String} params.amountToStake: Amount staked on Origin chain
   * @param {String} params.gasPrice: Gas price to calculate reward
   * @param {String} params.gasLimit: Gas limit for reward
   * @param {String} params.secretString: Secret to generate hashLock
   * @param {String} params.messageHash: Stake messageHash to generate storage proof.
   *
   * @augments Base
   *
   * @constructor
   */
  constructor(params) {
    super(params);
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

    await oThis._fetchContractAddresses();

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
   * Address kinds to fetch
   *
   * @return {{origin: *[]}}
   *
   * @private
   */
  _chainAddressKindsToFetch() {
    return {
      aux: [chainAddressConstants.auxCoGatewayContractKind],
      origin: [chainAddressConstants.originGatewayContractKind]
    };
  }

  /**
   * _tokenAddressKindsToFetch
   *
   * @return {{origin: *[]}}
   * @private
   */
  _tokenAddressKindsToFetch() {
    const oThis = this;

    let addrKinds = {};
    addrKinds[tokenAddressConstants.tokenGatewayContract] = chainAddressConstants.originGatewayContractKind;
    addrKinds[tokenAddressConstants.tokenCoGatewayContract] = chainAddressConstants.auxCoGatewayContractKind;
    addrKinds[tokenAddressConstants.brandedTokenContract] = tokenAddressConstants.brandedTokenContract;

    return addrKinds;
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

  _fetchAmountMinted() {
    const oThis = this;

    // In case of BT get the amount to be minted from contract
    if (oThis.tokenId) {
      let btStakeHelper = new BrandedToken.Helpers.StakeHelper(
        oThis.originWeb3,
        oThis.brandedTokenContract,
        oThis.gatewayComposer
      );
      return new Promise(function(onResolve, onReject) {
        btStakeHelper.convertToBTToken(oThis.amountToStake.toString(10)).then(function(resp) {
          onResolve(new BigNumber(resp));
        });
      });
    } else {
      return Promise.resolve(oThis.amountToStake);
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

    let staker = await oThis._getStakerAddress(),
      amountToMint = await oThis._fetchAmountMinted();

    let txObject = await mosaicFacilitator._confirmStakeIntentRawTx(
        staker,
        oThis.stakerNonce,
        oThis.beneficiary,
        amountToMint.toString(10),
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
