'use strict';

/*
 * This class file helps in the confirming staking intent in co-gateway
 */

const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  MerkleProof = require(rootPrefix + '/lib/stakeMintManagement/ProofGenerator');

const MosaicFacilitator = require('@openstfoundation/mosaic-facilitator.js');

class ProveGateway {
  constructor(params) {
    const oThis = this;

    oThis.originChainId = params.originChainId;
    oThis.auxChainId = params.auxChainId;
    oThis.lastSyncedBlock = params.lastSyncedBlock;
    oThis.facilitator = params.facilitator;
    oThis.gatewayContractAddress = params.gatewayContractAddress;
    oThis.stakerAddress = params.stakerAddress;
    oThis.stakerNonce = params.stakerNonce;
    oThis.beneficiary = params.beneficiary;
    oThis.stakeAmount = params.stakeAmount;
    oThis.hashLock = params.hashLock;
    oThis.lastSyncedBlock = params.lastSyncedBlock;
    oThis.stakeMessageHash = params.stakeMessageHash;
  }

  /**
   * perform
   *
   * @return {Promise|*|Promise<T>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error(`${__filename}::perform::catch`);
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'l_smm_csi_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
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
   * _setWeb3Instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.auxChainId]);

    oThis.auxChainConfig = response[oThis.auxChainId];
    oThis.wsProviders = oThis.auxChainConfig.auxGeth.readWrite.wsProviders;
    oThis.web3 = web3Provider.getInstance(oThis.wsProviders[0]).web3WsProvider;
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
      web3: oThis.web3,
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

    let mosaicFacilitator = new MosaicFacilitator.Helpers.CoGateway({
      contractAddress: oThis.coGatewayContractAddress
    });

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

    let txOptions = {
      gasPrice: '0',
      gas: '5000000',
      value: '0',
      from: oThis.facilitator,
      to: oThis.coGatewayContractAddress,
      data: data
    };

    let submitTransactionObj = new SubmitTransaction({
      chainId: oThis.auxChainId,
      txOptions: txOptions,
      provider: oThis.wsProviders[0]
    });

    return submitTransactionObj.perform();
  }
}
