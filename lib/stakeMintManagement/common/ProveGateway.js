'use strict';

/*
 * This class file helps in the proof of Gateway in coGateway
 */

const rootPrefix = '../../..',
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  Base = require(rootPrefix + '/lib/stakeMintManagement/Base'),
  MerkleProof = require(rootPrefix + '/lib/stakeMintManagement/common/ProofGenerator');

//const MosaicFacilitator = require('@openstfoundation/mosaic-facilitator.js');

class ProveGateway extends Base {
  /**
   * @constructor
   *
   * @param params {Object}
   * @param params.auxChainId               {Number}
   * @param params.originChainId            {Number}
   * @param params.lastSyncedBlock          {Number}
   * @param params.gatewayContract          {String}
   * @param params.facilitator              {String}
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

    await oThis._getMerkleProofForGateway();

    let response = await oThis._performGatewayProof();

    console.log('====response', response);
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
      aux: [chainAddressConstants.auxCoGatewayContractKind]
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
      contractAddress: oThis.gatewayContract,
      proofInputKeys: { [oThis.gatewayContract]: [] }
    });

    let response = await merkleProof.perform();

    oThis.serializedAccountProof = response.data.serializedAccountProof;
    oThis.rlpAccount = response.data.rlpAccount;
  }

  /**
   * _performGatewayProof
   *
   * @return {Promise<void>}
   * @private
   */
  async _performGatewayProof() {
    const oThis = this;

    // let mosaicFacilitator = new MosaicFacilitator.Helpers.CoGateway({
    //   contractAddress: oThis.coGatewayContract
    // });

    let contractHelper = require(rootPrefix + '/helpers/contractHelper');

    let mosaicFacilitator = await contractHelper.getMosaicTbdContractObj(
      oThis.auxWeb3,
      'EIP20CoGateway',
      oThis.coGatewayContract
    );
    mosaicFacilitator = mosaicFacilitator.methods;

    //TODO: ==== uncomment mosaicFacilitator fetch code and remove above code

    let data = mosaicFacilitator
      .proveGateway(oThis.lastSyncedBlock, oThis.rlpAccount, oThis.serializedAccountProof)
      .encodeABI();

    return oThis.performTransaction(
      oThis.auxChainId,
      oThis.auxWsProviders[0],
      oThis.facilitator,
      oThis.coGatewayContract,
      data
    );
  }
}

module.exports = ProveGateway;
