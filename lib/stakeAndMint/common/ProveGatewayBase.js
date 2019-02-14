'use strict';

/*
 * This class file helps in the proof of Gateway in coGateway
 */

const MosaicFacilitator = require('@openstfoundation/mosaic-facilitator.js');

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  StakeAndMintBase = require(rootPrefix + '/lib/stakeAndMint/Base'),
  StateRootCommitModel = require(rootPrefix + '/app/models/mysql/StateRootCommit'),
  MerkleProof = require(rootPrefix + '/lib/stakeAndMint/common/MerkleProofGenerator'),
  WorkflowStepsModel = require(rootPrefix + '/app/models/mysql/WorkflowStep');

class ProveGatewayOnCoGateway extends StakeAndMintBase {
  /**
   * @constructor
   *
   * @param params {Object}
   * @param {Number} params.currentWorkflowId - Current workflow id.
   * @param {Number} params.auxChainId - Aux chain Id to prove gateway on.
   * @param {Number} params.originChainId - Origin chain Id to prove gateway of.
   * @param {String} params.facilitator - Facilitator to help in proving.
   *
   * @param {Bool} [params.firstTimeMint] - First time mint or not (optional)
   *
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.currentWorkflowId = params.currentWorkflowId;
    oThis.auxChainId = params.auxChainId;
    oThis.originChainId = params.originChainId;
    oThis.facilitator = params.facilitator;

    oThis.lastSyncedBlock = null;
    oThis.coGatewayContract = null;
    oThis.gatewayContract = null;
    oThis.rlpAccount = null;
    oThis.serializedAccountProof = null;
  }

  /**
   * async Performer
   *
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._setWeb3Instance();

    await oThis._fetchGatewayAddresses();

    await oThis._fetchLastSyncedBlock();

    await oThis._getMerkleProofForGateway();

    if (!oThis.serializedAccountProof || !oThis.rlpAccount) {
      let retryFromId = 0,
        workflowStepModelObj = new WorkflowStepsModel(),
        commitRecords = await workflowStepModelObj
          .select('*')
          .where([
            'workflow_id = ? AND kind = (?)',
            oThis.currentWorkflowId,
            workflowStepModelObj.invertedKinds[workflowStepConstants.commitStateRoot]
          ])
          .fire();

      // If retried is not tried before then retry once.
      if (commitRecords.length == 1) {
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

    let response = await oThis._performGatewayProof();

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
          taskStatus: workflowStepConstants.taskFailed,
          taskResponseData: JSON.stringify(response)
        })
      );
    }
  }

  /**
   * Get merkle proof for gateway
   *
   * @return {Promise<void>}
   * @private
   */
  _getMerkleProofForGateway() {
    const oThis = this;

    let merkleProof = new MerkleProof({
      web3Instance: oThis.originWeb3,
      blockNumber: oThis.lastSyncedBlock,
      contractAddress: oThis.gatewayContract
    });

    return new Promise(function(onResolve, onReject) {
      merkleProof
        .perform()
        .then(function(resp) {
          oThis.serializedAccountProof = resp.data.serializedAccountProof;
          oThis.rlpAccount = resp.data.rlpAccount;
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
      source_chain_id: oThis.originChainId,
      target_chain_id: oThis.auxChainId
    });

    oThis.lastSyncedBlock = resp[0].block_number;
  }

  /**
   * Perform gateway proof
   *
   * @return {Promise<void>}
   * @private
   */
  async _performGatewayProof() {
    const oThis = this;

    let mosaicFacilitator = new MosaicFacilitator.CoGatewayHelper(
      oThis.auxWeb3,
      oThis.coGatewayContract,
      oThis.facilitator
    );

    let txObject = await mosaicFacilitator._proveGatewayRawTx(
        oThis.lastSyncedBlock,
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

module.exports = ProveGatewayOnCoGateway;
