/**
 * Module to confirm redeem intent on Gateway.
 *
 * @module lib/redeemAndUnstake/common/ConfirmRedeemIntent
 */

const MosaicJs = require('@openst/mosaic.js'),
  Web3Util = require('web3-utils');

const rootPrefix = '../../..',
  RedeemBase = require(rootPrefix + '/lib/redeemAndUnstake/Base'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  ContractInteractLayer = require(rootPrefix + '/lib/redeemAndUnstake/ContractInteractLayer'),
  util = require(rootPrefix + '/lib/util'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction');

/**
 * Class to confirm redeem intent on Gateway.
 *
 * @class ConfirmRedeemIntent
 */
class ConfirmRedeemIntent extends RedeemBase {
  /**
   * Constructor to confirm redeem intent on Gateway.
   *
   * @param {object} params
   * @param {object} params.payloadDetails
   * @param {number} params.originChainId
   * @param {number} params.auxChainId
   * @param {string} params.redeemerAddress
   * @param {number} params.amountToRedeem
   * @param {string} params.beneficiary
   * @param {string} params.facilitator
   * @param {string} params.messageHash
   * @param {string} params.redeemerNonce
   * @param {string} params.amountRedeemed
   * @param {string} params.secretString
   * @param {string} params.storageProof
   * @param {string} params.proveCoGatewayBlockNumber
   *
   * @augments RedeemBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.facilitator = params.facilitator;
    oThis.messageHash = params.messageHash;
    oThis.redeemerNonce = params.redeemerNonce;
    oThis.amountRedeemed = params.amountRedeemed;
    oThis.secretString = params.secretString;
    oThis.storageProof = params.storageProof;
    oThis.lastSyncedBlock = params.proveCoGatewayBlockNumber;

    oThis.gatewayContract = null;
    oThis.coGatewayContract = null;
  }

  /**
   * Set web3 instance.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;

    await oThis._setOriginWeb3Instance();

    await oThis._setAuxWeb3Instance();
  }

  /**
   * Fetch contract addresses involved in transaction.
   *
   * @sets oThis.gatewayContract, oThis.coGatewayContract
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchContractAddresses() {
    const oThis = this;

    // Fetch gateway contract address
    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    oThis.gatewayContract = chainAddressesRsp.data[chainAddressConstants.originGatewayContractKind].address;
    oThis.coGatewayContract = chainAddressesRsp.data[chainAddressConstants.auxCoGatewayContractKind].address;
  }

  /**
   * Get merkle proof for CoGateway.
   *
   * @return {Promise<void>}
   * @private
   */
  _getMerkleProofForCoGateway() {
    const oThis = this;

    const merkleProof = new MosaicJs.Utils.ProofGenerator(oThis.auxWeb3, oThis.originWeb3);

    return new Promise(function(onResolve, onReject) {
      merkleProof
        .getOutboxProof(oThis.coGatewayContract, [oThis.messageHash], Web3Util.toHex(oThis.lastSyncedBlock))
        .then(function(resp) {
          oThis.storageProof = resp.storageProof[0].serializedProof;
          onResolve();
        })
        .catch(function(err) {
          logger.error(err);
          onResolve();
        });
    });
  }

  /**
   * Build transaction data to be submitted.
   *
   * @sets oThis.transactionData
   *
   * @returns {Promise<void>}
   * @private
   */
  async _buildTransactionData() {
    const oThis = this;

    if (!oThis.storageProof) {
      await oThis._getMerkleProofForCoGateway();
    }

    const hashLockResponse = util.getSecretHashLock(oThis.secretString);

    const txData = await ContractInteractLayer.getConfirmRedeemIntentData(
      oThis.originWeb3,
      oThis.gatewayContract,
      oThis.redeemerAddress,
      oThis.redeemerNonce,
      oThis.beneficiary,
      oThis.amountRedeemed,
      '0',
      '0',
      oThis.lastSyncedBlock.toString(),
      hashLockResponse.hashLock,
      oThis.storageProof
    );

    const gasPrice = await oThis._fetchOriginGasPrice();

    oThis.transactionData = {
      gasPrice: gasPrice,
      gas: contractConstants.confirmRedeemIntentOnOriginGas,
      value: '0x0',
      from: oThis.facilitator,
      to: oThis.gatewayContract,
      data: txData
    };
  }

  /**
   * Get chain id on which transaction would be submitted.
   *
   * @returns {*}
   * @private
   */
  _getChainId() {
    const oThis = this;

    return oThis.originChainId;
  }

  /**
   * Extra data to be merged in response.
   *
   * @returns {{}}
   * @private
   */
  _mergeExtraResponseData() {
    return {};
  }

  /**
   * Get pending transaction kind.
   *
   * @returns {string}
   * @private
   */
  _getPendingTransactionKind() {
    return pendingTransactionConstants.confirmRedeemIntentKind;
  }
}

module.exports = ConfirmRedeemIntent;
