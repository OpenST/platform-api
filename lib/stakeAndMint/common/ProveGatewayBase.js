/**
 * Module to prove gateway in coGateway.
 *
 * @module lib/stakeAndMint/common/ProveGatewayBase
 */

const MosaicJs = require('@openst/mosaic.js'),
  Web3Util = require('web3-utils');

const rootPrefix = '../../..',
  StakeAndMintBase = require(rootPrefix + '/lib/stakeAndMint/Base'),
  WorkflowStepsModel = require(rootPrefix + '/app/models/mysql/WorkflowStep'),
  StateRootCommitModel = require(rootPrefix + '/app/models/mysql/StateRootCommit'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

/**
 * Class to prove gateway in coGateway.
 *
 * @class ProveGatewayOnCoGateway
 */
class ProveGatewayOnCoGateway extends StakeAndMintBase {
  /**
   * Constructor to prove gateway in coGateway.
   *
   * @param {object} params
   * @param {number} params.currentWorkflowId: Current workflow id.
   * @param {number} params.auxChainId: Aux chain Id to prove gateway on.
   * @param {number} params.originChainId: Origin chain Id to prove gateway of.
   * @param {string} params.facilitator: Facilitator to help in proving.
   * @param {string} params.lastCommittedBlockNumber: Last committed block number on Anchor.
   * @param {boolean} [params.firstTimeMint]: First time mint or not (optional)
   *
   * @augments StakeAndMintBase
   *
   * @constructor
   */
  constructor(params) {
    super();

    const oThis = this;

    oThis.currentWorkflowId = params.currentWorkflowId;
    oThis.auxChainId = params.auxChainId;
    oThis.originChainId = params.originChainId;
    oThis.facilitator = params.facilitator;
    oThis.lastSyncedBlock = params.lastCommittedBlockNumber;

    oThis.coGatewayContract = null;
    oThis.gatewayContract = null;
    oThis.rlpAccount = null;
    oThis.serializedAccountProof = null;
    oThis.originWeb3 = null;
  }

  /**
   * Async perform.
   *
   * @return {Promise<any>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._setWeb3Instance();

    await oThis._fetchGatewayAddresses();

    // await oThis._fetchLastSyncedBlock();

    await oThis._getMerkleProofForGateway();

    if (!oThis.serializedAccountProof || !oThis.rlpAccount) {
      let retryFromId = 0;

      const workflowStepModelObj = new WorkflowStepsModel();

      // Fetch all records including the ones which were retried.
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

      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskFailed,
          retryFromId: retryFromId,
          taskResponseData: { error: 'Merkle Proof not generated.' }
        })
      );
    }

    const response = await oThis._performGatewayProof();

    if (response.isSuccess()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskPending,
          transactionHash: response.data.transactionHash,
          taskResponseData: {
            chainId: oThis.auxChainId,
            transactionHash: response.data.transactionHash,
            proveGatewayBlockNumber: oThis.lastSyncedBlock
          }
        })
      );
    }

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskFailed,
        taskResponseData: JSON.stringify(response)
      })
    );
  }

  /**
   * Get merkle proof for gateway.
   *
   * @return {Promise<void>}
   * @private
   */
  _getMerkleProofForGateway() {
    const oThis = this;

    const merkleProof = new MosaicJs.Utils.ProofGenerator(oThis.originWeb3, oThis.auxWeb3);

    return new Promise(function(onResolve) {
      merkleProof
        .getOutboxProof(oThis.gatewayContract, [], Web3Util.toHex(oThis.lastSyncedBlock))
        .then(function(resp) {
          oThis.serializedAccountProof = resp.serializedAccountProof;
          oThis.rlpAccount = resp.encodedAccountValue;
          onResolve();
        })
        .catch(function(err) {
          logger.error(err);
          onResolve();
        });
    });
  }

  /**
   * Fetch last synced block.
   *
   * @sets oThis.lastSyncedBlock
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchLastSyncedBlock() {
    const oThis = this;

    const stateRootCommitModel = new StateRootCommitModel();

    const resp = await stateRootCommitModel.getLastSyncedBlock({
      source_chain_id: oThis.originChainId,
      target_chain_id: oThis.auxChainId
    });

    oThis.lastSyncedBlock = resp[0].block_number;
  }

  /**
   * Perform gateway proof.
   *
   * @return {Promise<void>}
   * @private
   */
  async _performGatewayProof() {
    const oThis = this;

    const contractInteract = new MosaicJs.ContractInteract.EIP20CoGateway(oThis.auxWeb3, oThis.coGatewayContract);

    const txObject = await contractInteract.proveGatewayRawTx(
        oThis.lastSyncedBlock.toString(),
        oThis.rlpAccount,
        oThis.serializedAccountProof
      ),
      data = txObject.encodeABI(),
      txOptions = {
        gasPrice: oThis._fetchGasPrice(),
        gas: contractConstants.proveGatewayOnAuxGas
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

module.exports = ProveGatewayOnCoGateway;
