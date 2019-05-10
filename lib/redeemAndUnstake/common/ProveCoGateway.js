/**
 * Module to help prove Co-Gateway on Gateway contract.
 *
 * @module lib/redeemAndUnstake/common/ProveCoGateway
 */

const MosaicJs = require('@openst/mosaic.js'),
  Web3Util = require('web3-utils');

const rootPrefix = '../../..',
  RedeemBase = require(rootPrefix + '/lib/redeemAndUnstake/Base'),
  WorkflowStepsModel = require(rootPrefix + '/app/models/mysql/WorkflowStep'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  ContractInteractLayer = require(rootPrefix + '/lib/redeemAndUnstake/ContractInteractLayer'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction');

/**
 * Class to help prove Co-Gateway on Gateway contract.
 *
 * @class ProveCoGateway
 */
class ProveCoGateway extends RedeemBase {
  /**
   * Constructor to help prove Co-Gateway on Gateway contract.
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
   * @param {string} params.lastCommittedBlockNumber
   * @param {string} params.currentWorkflowId
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
    oThis.lastSyncedBlock = params.lastCommittedBlockNumber;
    oThis.currentWorkflowId = params.currentWorkflowId;

    oThis.gatewayContract = null;
    oThis.coGatewayContract = null;
    oThis.serializedAccountProof = null;
    oThis.rlpAccount = null;
    oThis.storageProof = null;
  }

  /**
   * Set web3 instances.
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

    // Fetch gateway contract address.
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
          oThis.serializedAccountProof = resp.serializedAccountProof;
          oThis.rlpAccount = resp.encodedAccountValue;
          oThis.storageProof = resp.storageProof[0].serializedProof;
          onResolve();
        })
        .catch(function(err) {
          logger.error(err);
          onReject('Merkle proof not generated.');
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

    await oThis._getMerkleProofForCoGateway();

    const txData = await ContractInteractLayer.getProveCoGatewayOnGatewayData(
      oThis.originWeb3,
      oThis.gatewayContract,
      oThis.lastSyncedBlock.toString(),
      oThis.rlpAccount,
      oThis.serializedAccountProof
    );

    const gasPrice = await oThis._fetchOriginGasPrice();
    oThis.transactionData = {
      gasPrice: gasPrice,
      gas: contractConstants.proveCoGatewayOnOriginGas,
      value: '0x0',
      from: oThis.facilitator,
      to: oThis.gatewayContract,
      data: txData
    };
  }

  /**
   * Method to set Retry from, if retry is possible.
   *
   * @returns {Promise<number>}
   * @private
   */
  async _isRetryPossible() {
    const oThis = this;

    let retryFromId = 0;

    const workflowStepModelObj = new WorkflowStepsModel();

    // Fetch all records including the ones which were retried
    const commitRecords = await workflowStepModelObj
      .select('*')
      .where([
        'workflow_id = ? AND kind = (?)',
        oThis.currentWorkflowId,
        workflowStepModelObj.invertedKinds[workflowStepConstants.commitStateRoot]
      ])
      .fire();

    // If retried is not tried before then retry once.
    if (commitRecords.length === 1) {
      retryFromId = commitRecords[commitRecords.length - 1].id;
    }

    return retryFromId;
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
   * @return {{storageProof: (null|*), proveCoGatewayBlockNumber: (string|*)}}
   * @private
   */
  _mergeExtraResponseData() {
    const oThis = this;

    return {
      storageProof: oThis.storageProof,
      proveCoGatewayBlockNumber: oThis.lastSyncedBlock
    };
  }

  /**
   * Get pending transaction kind.
   *
   * @returns {string}
   * @private
   */
  _getPendingTransactionKind() {
    return pendingTransactionConstants.proveCoGatewayOnGatewayKind;
  }
}

module.exports = ProveCoGateway;
