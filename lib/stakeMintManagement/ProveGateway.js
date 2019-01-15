'use strict';

/*
 * This class file helps in the proof of Gateway in coGateway
 */

const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/signSubmitTrxOnChain'),
  MerkleProof = require(rootPrefix + '/lib/stakeMintManagement/ProveGateway');

const MosaicFacilitator = require('@openstfoundation/mosaic-facilitator.js');

class ProveGateway {
  constructor(params) {
    const oThis = this;

    oThis.originChainId = params.originChainId;
    oThis.auxChainId = params.auxChainId;
    oThis.lastSyncedBlock = params.lastSyncedBlock;
    oThis.gatewayContractAddress = params.gatewayContractAddress;
    oThis.facilitator = params.facilitator;
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
          internal_error_identifier: 'l_smm_pg_1',
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

    await oThis._getCoGatewayAddress();

    await oThis._getMerkleProofForGateway();

    await oThis._performGatewayProof();
  }

  /**
   * _setWeb3Instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.originChainId]);

    oThis.originChainConfig = response[oThis.originChainId];
    oThis.wsProviders = oThis.originChainConfig.originGeth.readWrite.wsProviders;
    oThis.web3 = web3Provider.getInstance(oThis.wsProviders[0]).web3WsProvider;
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
      web3: oThis.web3,
      blockNumber: oThis.lastSyncedBlock,
      contractAddress: oThis.gatewayContractAddress,
      proofInputKeys: { [oThis.gatewayContractAddress]: [] }
    });

    let response = await merkleProof.perform();

    let accountProof = response.data.accountProof;

    oThis.serializedAccountProof = response.data.serializedAccountProof;
    oThis.rlpAccount = accountProof[accountProof.length - 1];
  }

  /**
   * _getCoGatewayAddress
   *
   * @return {Promise<void>}
   * @private
   */
  async _getCoGatewayAddress() {
    const oThis = this;

    let resp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.auxChainId,
      auxChainId: oThis.auxChainId,
      kind: chainAddressConstants.auxCoGatewayContractKind
    });

    if (resp.isSuccess()) {
      oThis.coGatewayContractAddress = resp.data.address;
    }
  }

  /**
   * _performGatewayProof
   *
   * @return {Promise<void>}
   * @private
   */
  async _performGatewayProof() {
    const oThis = this;

    let gasPrice = '0';

    let mosaicFacilitator = new MosaicFacilitator.Helpers.CoGateway({
      contractAddress: oThis.coGatewayContractAddress
    });

    let data = mosaicFacilitator
      .proveGateway(oThis.lastSyncedBlock, oThis.rlpAccount, oThis.serializedAccountProof)
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
      chainId: oThis.originChainId,
      txOptions: txOptions,
      provider: oThis.wsProviders[0]
    });

    return submitTransactionObj.perform();
  }
}

module.exports = ProveGateway;
