/**
 * Module to confirm staking intent on CoGateway.
 *
 * @module lib/stakeAndMint/common/ConfirmStakeIntentBase
 */

const BigNumber = require('bignumber.js'),
  MosaicJs = require('@openst/mosaic.js'),
  Web3Util = require('web3-utils');

const rootPrefix = '../../..',
  StakeAndMintBase = require(rootPrefix + '/lib/stakeAndMint/Base'),
  util = require(rootPrefix + '/lib/util'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

/**
 * Class to confirm staking intent on CoGateway.
 *
 * @class ConfirmStakeIntentOnCoGateway
 */
class ConfirmStakeIntentOnCoGateway extends StakeAndMintBase {
  /**
   * Constructor to confirm staking intent on CoGateway.
   *
   * @param {object} params
   * @param {number} params.auxChainId: Aux chain Id to prove gateway on.
   * @param {number} params.originChainId: Origin chain Id to prove gateway of.
   * @param {string/number} params.amountMinted: amountMinted.
   * @param {string} params.messageHash: messageHash.
   * @param {string} params.stakerAddress: stakerAddress.
   * @param {string} params.facilitator: Facilitator to help in proving.
   * @param {string} params.secretString: secretString
   * @param {string} params.stakerNonce: stakerNonce
   * @param {string} params.beneficiary: beneficiary.
   * @param {string} params.gasPrice: gasPrice
   * @param {string} params.gasLimit: gasLimit
   * @param {string} params.proveGatewayBlockNumber: proveGatewayBlockNumber
   * @param {boolean} [params.firstTimeMint]: First time mint or not (optional)
   *
   * @augments StakeAndMintBase
   *
   * @constructor
   */
  constructor(params) {
    super();

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
    oThis.coGatewayContract = '';
    oThis.storageProof = null;
    oThis.rlpAccount = null;
  }

  /**
   * Async perform.
   *
   * @return {Promise<any>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._validateStakeAmount();

    await oThis._setWeb3Instance();

    await oThis._fetchGatewayAddresses();

    await oThis._getMerkleProofForGateway();

    const response = await oThis._performConfirmStakeIntent();

    if (response.isSuccess()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskPending,
          transactionHash: response.data.transactionHash,
          taskResponseData: { chainId: oThis.auxChainId, transactionHash: response.data.transactionHash }
        })
      );
    }

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskPending,
        taskResponseData: JSON.stringify(response)
      })
    );
  }

  /**
   * Validate stake amount.
   *
   * @sets oThis.amountMinted
   *
   * @return {Promise<void>}
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
   * Get merkle proof for gateway.
   *
   * @return {Promise<void>}
   * @private
   */
  async _getMerkleProofForGateway() {
    const oThis = this;

    const merkleProof = new MosaicJs.Utils.ProofGenerator(oThis.originWeb3, oThis.auxWeb3);

    const response = await merkleProof.getOutboxProof(
      oThis.gatewayContract,
      [oThis.messageHash],
      Web3Util.toHex(oThis.lastSyncedBlock)
    );

    oThis.storageProof = response.storageProof[0].serializedProof;
    oThis.rlpAccount = response.encodedAccountValue;
  }

  /**
   * Decide staker in the transaction.
   *
   * @return {Promise<void>}
   * @private
   */
  async _getStakerAddress() {
    throw new Error('Sub-class to implement.');
  }

  /**
   * Perform confirm stake intent on CoGateway.
   *
   * @return {Promise<void>}
   * @private
   */
  async _performConfirmStakeIntent() {
    const oThis = this;

    const contractInteract = new MosaicJs.ContractInteract.EIP20CoGateway(oThis.auxWeb3, oThis.coGatewayContract);

    const hashLock = util.generateHashLock(oThis.secretString).hashLock;

    const staker = await oThis._getStakerAddress();

    const txObject = await contractInteract.confirmStakeIntentRawTx(
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
      oThis.auxShuffledProviders[0],
      oThis.facilitator,
      oThis.coGatewayContract,
      txOptions,
      data
    );
  }

  /**
   * Fetch gateway addresses.
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchGatewayAddresses() {
    throw new Error('Sub-class to implement.');
  }

  /**
   * Fetch gas price.
   *
   * @private
   */
  _fetchGasPrice() {
    throw new Error('Sub-class to implement.');
  }
}

module.exports = ConfirmStakeIntentOnCoGateway;
