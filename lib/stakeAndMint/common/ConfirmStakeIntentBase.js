'use strict';
/**
 * This module helps to confirm staking intent on CoGateway
 *
 * @module lib/stakeAndMint/common/ConfirmStakeIntentBase
 */
const BigNumber = require('bignumber.js'),
  MosaicJs = require('@openstfoundation/mosaic.js'),
  Web3Util = require('web3-utils');

const rootPrefix = '../../..',
  util = require(rootPrefix + '/lib/util'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  StateRootCommitModel = require(rootPrefix + '/app/models/mysql/StateRootCommit'),
  StakeAndMintBase = require(rootPrefix + '/lib/stakeAndMint/Base');

class ConfirmStakeIntentOnCoGateway extends StakeAndMintBase {
  /**
   * @constructor
   *
   * @param params {Object}
   * @param {Number} params.auxChainId - Aux chain Id to prove gateway on.
   * @param {Number} params.originChainId - Origin chain Id to prove gateway of.
   * @param {String|Number} params.amountMinted - amountMinted.
   * @param {String} params.messageHash - messageHash.
   * @param {String} params.stakerAddress - stakerAddress.
   * @param {String} params.facilitator - Facilitator to help in proving.
   * @param {String} params.secretString - secretString
   * @param {String} params.stakerNonce - stakerNonce
   * @param {String} params.beneficiary - beneficiary.
   * @param {String} params.gasPrice - gasPrice
   * @param {String} params.gasLimit - gasLimit
   *
   * @param {Bool} [params.firstTimeMint] - First time mint or not (optional)
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
    oThis.lastSyncedBlock = params.proveGatewayBlockNumber;

    oThis.gatewayContract = null;
    oThis.coGatewayContract = null;
    oThis.storageProof = null;
    oThis.rlpAccount = null;
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

    let merkleProof = new MosaicJs.Utils.ProofGenerator(oThis.originWeb3, oThis.auxWeb3);

    let response = await merkleProof.getOutboxProof(
      oThis.gatewayContract,
      [oThis.messageHash],
      Web3Util.toHex(oThis.lastSyncedBlock)
    );

    oThis.storageProof = response.storageProof[0].serializedProof;
    oThis.rlpAccount = response.encodedAccountValue;
  }

  /**
   * Decide Staker in the transaction
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _getStakerAddress() {
    throw 'sub-class to implement';
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

    let contractInteract = new MosaicJs.ContractInteract.EIP20CoGateway(oThis.auxWeb3, oThis.coGatewayContract);

    let hashLock = util.generateHashLock(oThis.secretString).hashLock;

    let staker = await oThis._getStakerAddress();

    let txObject = await contractInteract.confirmStakeIntentRawTx(
        staker,
        oThis.stakerNonce,
        oThis.beneficiary,
        oThis.amountMinted.toString(10),
        oThis.gasPrice || '0',
        oThis.gasLimit || '0',
        hashLock,
        oThis.lastSyncedBlock.toString(),
        oThis.storageProof
      ),
      data = txObject.encodeABI(),
      txOptions = {
        gasPrice: oThis._fetchGasPrice(),
        gas: contractConstants.confirmStakeIntentGas
      };

    return oThis.performTransaction(
      oThis.auxChainId,
      oThis.auxWsProviders[0],
      oThis.facilitator,
      oThis.coGatewayContract,
      txOptions,
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

  /**
   * Fetch gas price
   *
   * @private
   */
  _fetchGasPrice() {
    throw 'sub-class to implement';
  }
}

module.exports = ConfirmStakeIntentOnCoGateway;
