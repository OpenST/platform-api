'use strict';
/*
 * This module helps in confirming redeem intent on Gateway.
 *
 * @module lib/redeemAndUnstake/common/ConfirmRedeemIntent
 */

const MosaicJs = require('@openst/mosaic.js'),
  Web3Util = require('web3-utils');

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  ContractInteractLayer = require(rootPrefix + '/lib/redeemAndUnstake/ContractInteractLayer'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  StateRootCommitModel = require(rootPrefix + '/app/models/mysql/StateRootCommit'),
  RedeemBase = require(rootPrefix + '/lib/redeemAndUnstake/Base');

class ConfirmRedeemIntent extends RedeemBase {
  /**
   * @constructor
   *
   * @param params
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

    oThis.gatewayContract = null;
    oThis.coGatewayContract = null;
    oThis.lastSyncedBlock = null;
  }

  /**
   * Set web3 instance
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
   * Fetch contract addresses involved in transaction
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchContractAddresses() {
    const oThis = this;

    // Fetch gateway contract address
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    oThis.gatewayContract = chainAddressesRsp.data[chainAddressConstants.originGatewayContractKind].address;
    oThis.coGatewayContract = chainAddressesRsp.data[chainAddressConstants.auxCoGatewayContractKind].address;
  }

  /**
   * Get merkle proof for CoGateway
   *
   * @return {Promise<void>}
   * @private
   */
  _getMerkleProofForCoGateway() {
    const oThis = this;

    let merkleProof = new MosaicJs.Utils.ProofGenerator(oThis.auxWeb3, oThis.originWeb3);

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
   * Fetch last synced block
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchLastSyncedBlock() {
    const oThis = this;

    let stateRootCommitModel = new StateRootCommitModel();

    let resp = await stateRootCommitModel.getLastSyncedBlock({
      source_chain_id: oThis.auxChainId,
      target_chain_id: oThis.originChainId
    });

    oThis.lastSyncedBlock = resp[0].block_number;
  }

  /**
   * Build transaction data to be submitted
   *
   * @returns {Promise<void>}
   * @private
   */
  async _buildTransactionData() {
    const oThis = this;

    await oThis._fetchLastSyncedBlock();

    if (!oThis.storageProof) {
      await oThis._getMerkleProofForCoGateway();
    }

    let hashLockResponse = oThis.getSecretHashLock(oThis.secretString);

    let txData = await ContractInteractLayer.getConfirmRedeemIntentData(
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
   * Get chain id on which transaction would be submitted
   *
   * @returns {*}
   * @private
   */
  _getChainId() {
    const oThis = this;

    return oThis.originChainId;
  }

  /**
   * Extra data to be merged in response
   *
   * @returns {{}}
   * @private
   */
  _mergeExtraResponseData() {
    return {};
  }
}

module.exports = ConfirmRedeemIntent;
