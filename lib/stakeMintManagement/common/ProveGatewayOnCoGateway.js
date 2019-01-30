'use strict';

/*
 * This class file helps in the proof of Gateway in coGateway
 */

const rootPrefix = '../../..',
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  Base = require(rootPrefix + '/lib/stakeMintManagement/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  StateRootCommitModel = require(rootPrefix + '/app/models/mysql/StateRootCommit'),
  MerkleProof = require(rootPrefix + '/lib/stakeMintManagement/MerkleProofGenerator'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  WorkflowStepsModel = require(rootPrefix + '/app/models/mysql/WorkflowStep');

const MosaicFacilitator = require('@openstfoundation/mosaic-facilitator.js');

class ProveGatewayOnCoGateway extends Base {
  /**
   * @constructor
   *
   * @param params {Object}
   * @param params.auxChainId               {Number} - Aux chain Id to prove gateway on.
   * @param params.originChainId            {Number} - Origin chain Id to prove gateway of.
   * @param params.facilitator              {String} - Facilitator to help in proving.
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
        retryFromId = commitRecords[0].id;
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
   * _chainAddressKindsToFetch
   *
   * @return {{origin: *[]}}
   * @private
   */
  _chainAddressKindsToFetch() {
    const oThis = this;

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

    return addrKinds;
  }

  /**
   * _getMerkleProofForGateway
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
   * _fetchLastSyncedBlock
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
   * _performGatewayProof
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

module.exports = ProveGatewayOnCoGateway;
