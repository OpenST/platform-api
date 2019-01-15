'use strict';

/**
 * Commit State root of chain to Anchor contract of another chain
 *
 * @module lib/stateRootSync/commitStateRoot
 */
const MosaicAnchor = require('@openstfoundation/mosaic-anchor.js');

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  NonceManager = require(rootPrefix + '/lib/nonce/Manager'),
  signerWeb3Provider = require(rootPrefix + '/lib/providers/signerWeb3'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain');

class commitStateRoot {
  /**
   * Constructor
   *
   * @param params {Object}
   * @param {Number} params.auxChainId - Auxiliary Chain Id with respect to which operation would happen
   * @param {Number} params.fromOriginToAux - Flag to determine whether state root has to be committed from Origin to Aux OR Aux to Origin.
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.fromOriginToAux = params.fromOriginToAux;

    oThis.auxChainConfig = null;
    oThis.sourceChainId = null;
    oThis.destinationChainId = null;
    oThis.chainProviders = {};
  }

  /**
   *
   * Perform
   *
   * @param payloadDetails {Object} - Payload data to be used after finalizer marks transaction complete
   *
   * @return {Promise<result>}
   *
   */
  async perform(payloadDetails) {
    const oThis = this;

    oThis.payloadDetails = payloadDetails;

    await oThis._fetchAuxChainConfig();

    let resp = await oThis._commitTransaction();

    if (resp.isSuccess()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskDone: 0,
          transactionHash: resp.data.transactionHash,
          taskResponseData: { transactionHash: resp.data.transactionHash }
        })
      );
    } else {
      return Promise.resolve(responseHelper.successWithData({ taskDone: 0, taskResponseData: resp.toJSON() }));
    }
  }

  /***
   *
   * Fetch config for Auxiliary Chain
   *
   * @return {object}
   */
  async _fetchAuxChainConfig() {
    const oThis = this,
      rsp = await chainConfigProvider.getFor([oThis.auxChainId]);

    oThis.auxChainConfig = rsp[oThis.auxChainId];

    oThis.chainProviders[oThis.auxChainConfig.originGeth.chainId] =
      oThis.auxChainConfig.originGeth.readWrite.wsProviders;
    oThis.chainProviders[oThis.auxChainConfig.auxGeth.chainId] = oThis.auxChainConfig.auxGeth.readWrite.wsProviders;

    if (oThis.fromOriginToAux) {
      oThis.sourceChainId = oThis.auxChainConfig.originGeth.chainId;
      oThis.destinationChainId = oThis.auxChainConfig.auxGeth.chainId;
    } else {
      oThis.destinationChainId = oThis.auxChainConfig.originGeth.chainId;
      oThis.sourceChainId = oThis.auxChainConfig.auxGeth.chainId;
    }
  }

  /***
   *
   * Fetch Anchor contract address
   *
   * @return {object}
   */
  async _fetchAnchorContractAddress() {
    const oThis = this;

    let kind = null;
    // If destination chain is an auxiliary chain
    if (oThis.destinationChainId == oThis.auxChainId) {
      kind = chainAddressConstants.auxAnchorContractKind;
    } else {
      kind = chainAddressConstants.originAnchorContractKind;
    }

    let resp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.destinationChainId,
      auxChainId: oThis.auxChainId,
      kind: kind
    });

    if (resp.isSuccess()) {
      oThis.anchorContract = resp.data.address;
    }
  }

  /***
   *
   * Fetch organization owner address
   *
   * @return {object}
   */
  async _fetchOrganizationOwnerAddress() {
    const oThis = this;

    let resp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.destinationChainId,
      kind: chainAddressConstants.ownerKind
    });

    if (resp.isSuccess()) {
      oThis.organizationOwner = resp.data.address;
    }
  }

  /***
   * Fetch Nonce of organization owner
   *
   * @return {object}
   */
  async _fetchNonce() {
    const oThis = this;
    let resp = await new NonceManager({
      address: oThis.organizationOwner,
      chainId: oThis.destinationChainId
    }).getNonce();

    if (resp.isSuccess()) {
      oThis.addressNonce = resp.data.nonce;
    }
  }

  async _commitTransaction() {
    const oThis = this;

    await oThis._fetchAnchorContractAddress();

    await oThis._fetchOrganizationOwnerAddress();

    let sourceProvider = oThis.chainProviders[oThis.sourceChainId][0],
      sourceWeb3 = await new signerWeb3Provider(sourceProvider).getInstance(),
      destProvider = oThis.chainProviders[oThis.destinationChainId][0],
      destinationWeb3 = await new signerWeb3Provider(destProvider, oThis.organizationOwner).getInstance();

    let confirmations = 24;

    await oThis._fetchNonce();

    let txOptions = {
      gasPrice: '0x0',
      gas: '1000000',
      nonce: oThis.addressNonce,
      chainId: oThis.destinationChainId,
      value: '0x00',
      from: oThis.organizationOwner,
      to: oThis.anchorContract
    };

    let oAnchor = new MosaicAnchor.Anchor(
      sourceWeb3,
      destinationWeb3,
      oThis.anchorContract,
      oThis.organizationOwner,
      confirmations,
      txOptions
    );

    //Get last anchored state-root block height
    oAnchor.getLatestStateRootBlockHeight().then(function(blockHeight) {
      console.log('blockHeight', blockHeight);
    });

    // This will return transaction object to submit transaction.
    let txObject = await oAnchor._anchorStateRoot(null, txOptions);

    txOptions['data'] = txObject.encodeABI();

    return new SubmitTransaction({
      chainId: oThis.destinationChainId,
      web3Instance: destinationWeb3,
      txOptions: txOptions,
      options: oThis.payloadDetails
    }).perform();
  }
}

module.exports = commitStateRoot;
