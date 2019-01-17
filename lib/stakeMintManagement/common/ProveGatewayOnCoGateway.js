'use strict';

/*
 * This class file helps in the proof of Gateway in coGateway
 */

const rootPrefix = '../../..',
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  Base = require(rootPrefix + '/lib/stakeMintManagement/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  StateRootCommitModel = require(rootPrefix + '/app/models/mysql/StateRootCommit'),
  MerkleProof = require(rootPrefix + '/lib/stakeMintManagement/MerkleProofGenerator');

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

    let response = await oThis._performGatewayProof();

    if (response.isSuccess()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskDone: 0,
          taskResponseData: { chainId: oThis.auxChainId, transactionHash: response.data.transactionHash }
        })
      );
    } else {
      return Promise.resolve(
        responseHelper.successWithData({ taskDone: 0, taskResponseData: JSON.stringify(response) })
      );
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
      contractAddress: oThis.gatewayContract
    });

    let response = await merkleProof.perform();

    oThis.serializedAccountProof = response.data.serializedAccountProof;
    oThis.rlpAccount = response.data.rlpAccount;
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
