'use strict';

/*
 * This class file helps in the confirming staking intent in co-gateway
 */

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  Base = require(rootPrefix + '/lib/stakeMintManagement/Base'),
  MerkleProof = require(rootPrefix + '/lib/stakeMintManagement/ProofGenerator');

// const MosaicFacilitator = require('@openstfoundation/mosaic-facilitator.js');

class ProveGateway extends Base {
  /**
   * @constructor
   *
   * @param params {Object}
   * @param params.auxChainId               {Number}
   * @param params.lastSyncedBlock          {Number}
   * @param params.gatewayContract          {String}
   * @param params.facilitator              {String}
   * @param params.stakerAddress            {String}
   * @param params.stakerNonce              {Number}
   * @param params.stakeAmount              {Number}
   * @param params.beneficiary              {String}
   * @param params.hashLock                 {String}
   * @param params.stakeMessageHash         {String}
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

    await oThis._getGetwayOutboxStorageProof();

    await oThis._confirmStakeIntent();
  }

  /**
   * _getGetwayOutboxStorageProof
   *
   * @return {Promise<void>}
   * @private
   */
  async _getGetwayOutboxStorageProof() {
    const oThis = this;

    let merkleProof = new MerkleProof({
      web3Instance: oThis.auxWeb3,
      blockNumber: oThis.lastSyncedBlock,
      contractAddress: oThis.gatewayContractAddress,
      proofInputKeys: { [oThis.gatewayContractAddress]: [oThis.stakeMessageHash] }
    });

    let response = await merkleProof.perform();

    oThis.serializedAccountProof = response.data.serializedAccountProof;
  }

  /**
   * _confirmStakeIntent
   *
   * @return {Promise<void>}
   * @private
   */
  async _confirmStakeIntent() {
    const oThis = this;

    let gasPrice = '0';

    // let mosaicFacilitator = new MosaicFacilitator.Helpers.CoGateway({
    //   contractAddress: oThis.coGatewayContractAddress
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
      .confirmStakeIntent(
        oThis.stakerAddress,
        oThis.stakerNonce,
        oThis.beneficiary,
        oThis.stakeAmount,
        gasPrice,
        coreConstants.OST_AUX_GAS_LIMIT,
        oThis.hashLock,
        oThis.lastSyncedBlock,
        oThis.serializedAccountProof
      )
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
