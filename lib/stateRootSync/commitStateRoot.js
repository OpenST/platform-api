'use strict';

/**
 * Commit State root of chain to Anchor contract of another chain
 *
 * @module lib/stateRootSync/commitStateRoot
 */
const MosaicAnchor = require('mosaic-anchor.js');

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  AddressPrivateKeyCache = require(rootPrefix + '/lib/sharedCacheManagement/AddressPrivateKey'),
  web3Provider = require(rootPrefix + '/lib/providers/web3');

class commitStateRoot {
  /**
   * Constructor
   *
   * @param {Number} auxChainId - Auxiliary Chain Id with respect to which operation would happen
   * @param {Number} fromOriginToAux - Flag to determine whether state root has to be committed from Origin to Aux OR Aux to Origin.
   *
   * @constructor
   */
  constructor(auxChainId, fromOriginToAux) {
    const oThis = this;

    oThis.auxChainId = auxChainId;
    oThis.fromOriginToAux = fromOriginToAux;

    oThis.auxChainConfig = null;
    oThis.sourceChainId = null;
    oThis.destinationChainId = null;
    oThis.chainProviders = {};
  }

  /**
   *
   * Perform
   *
   * @return {Promise<result>}
   *
   */
  async perform(stepDetails) {
    const oThis = this;

    await oThis._fetchAuxChainConfig();

    await oThis._commitTransaction();

    //oThis._createPendingTransaction();

    return Promise.resolve(
      responseHelper.successWithData({ taskDone: 0, taskResponseData: { testRespHash: 'hdjskal123zxfnm 5' } })
    );
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

  async _fetchAnchorContractAddress() {
    const oThis = this;

    let resp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.destinationChainId,
      kind: chainAddressConstants.auxAnchorContractKind
    });

    if (resp.isSuccess()) {
      oThis.anchorContract = resp.data.address;
    }
  }

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

  async _fetchOrganizationOwnerKey() {
    const oThis = this;

    let addressPrivateKeyCache = new AddressPrivateKeyCache({ address: oThis.organizationOwner }),
      cacheFetchRsp = await addressPrivateKeyCache.fetchDecryptedData(),
      signerKey = cacheFetchRsp.data['private_key_d'];

    return signerKey;
  }

  async _commitTransaction() {
    const oThis = this;

    let sourceProvider = oThis.chainProviders[oThis.sourceChainId][0],
      sourceWeb3 = web3Provider.getInstance(sourceProvider).web3WsProvider,
      destProvider = oThis.chainProviders[oThis.destinationChainId][0],
      destinationWeb3 = web3Provider.getInstance(destProvider).web3WsProvider;

    await oThis._fetchAnchorContractAddress();

    await oThis._fetchOrganizationOwnerAddress();

    let signerKey = await oThis._fetchOrganizationOwnerKey();

    destinationWeb3.eth.accounts.wallet.add(signerKey);

    let confirmations = 24;

    let oAnchor = new MosaicAnchor.Anchor(
      sourceWeb3,
      destinationWeb3,
      oThis.anchorContract,
      oThis.organizationOwner,
      confirmations
    );

    oAnchor
      .validate()
      .then(function() {
        console.log('oAnchor is valid');
        //Do your task here.
      })
      .catch(function(error) {
        console.log('oAnchor is invalid. Error:', error);
      });

    //Get last anchored state-root block height
    oAnchor.getLatestStateRootBlockHeight().then(function(blockHeight) {
      console.log('blockHeight', blockHeight);
    });

    //Anchor state-root.
    oAnchor.anchorStateRoot();
  }
}

module.exports = commitStateRoot;
