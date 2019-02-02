'use strict';

/**
 * Base of state root commit sync
 *
 * @module lib/stateRootSync/Base
 */
const MosaicAnchor = require('@openstfoundation/mosaic-anchor.js');

const rootPrefix = '../..',
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  web3Provider = require(rootPrefix + '/lib/providers/web3');

class Base {
  /**
   * Constructor to commit State root of chain to Anchor contract of another chain.
   *
   * @param {Object} params
   * @param {Number} params.auxChainId: Auxiliary Chain Id with respect to which operation would happen
   * @param {Number} params.fromOriginToAux: Flag to determine whether state root has to be committed from Origin to Aux OR Aux to Origin.
   * @param {Number} params.blockNumber - Block Number to sync state root for
   * @param {Number} params.sourceChainId: Source Chain Id for which state root sync is started.
   * @param {Number} params.destinationChainId: Destination Chain Id where state root would be synced.
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.fromOriginToAux = params.fromOriginToAux;
    oThis.blockNumber = params.blockNumber;
    oThis.sourceChainId = params.sourceChainId;
    oThis.destinationChainId = params.destinationChainId;

    oThis.auxChainConfig = null;
    oThis.chainProviders = {};
  }

  /**
   * Create Mosaic Anchor Obj
   *
   * @return {Promise<result>}
   */
  async _createMosaicAnchorObj() {
    const oThis = this;

    await oThis._fetchAuxChainConfig();

    await oThis._fetchAnchorAddresses();

    let sourceProvider = oThis.chainProviders[oThis.sourceChainId][0],
      destProvider = oThis.chainProviders[oThis.destinationChainId][0],
      destinationWeb3 = web3Provider.getInstance(destProvider).web3WsProvider;

    oThis.sourceWeb3 = web3Provider.getInstance(sourceProvider).web3WsProvider;
    oThis.destinationChainUrl = destProvider;

    oThis.txOptions = {
      gasPrice: contractConstants.auxChainGasPrice,
      gas: '1000000',
      chainId: oThis.destinationChainId,
      value: '0x00',
      from: oThis.organizationAdmin,
      to: oThis.anchorContract
    };

    let oAnchor = new MosaicAnchor.Anchor(
      oThis.sourceWeb3,
      destinationWeb3,
      oThis.anchorContract,
      oThis.organizationAdmin,
      oThis.confirmations,
      oThis.txOptions
    );

    return oAnchor;
  }

  /**
   * Fetch config for Auxiliary Chain
   *
   * @return {Object}
   */
  async _fetchAuxChainConfig() {
    const oThis = this,
      rsp = await chainConfigProvider.getFor([oThis.auxChainId]);

    oThis.auxChainConfig = rsp[oThis.auxChainId];

    let chainBlockDelay = {};
    oThis.chainProviders[oThis.auxChainConfig.originGeth.chainId] =
      oThis.auxChainConfig.originGeth.readWrite.wsProviders;
    oThis.chainProviders[oThis.auxChainConfig.auxGeth.chainId] = oThis.auxChainConfig.auxGeth.readWrite.wsProviders;
    chainBlockDelay[oThis.auxChainConfig.originGeth.chainId] = oThis.auxChainConfig.originGeth.finalizeAfterBlocks;
    chainBlockDelay[oThis.auxChainConfig.auxGeth.chainId] = oThis.auxChainConfig.auxGeth.finalizeAfterBlocks;

    // If source chain and destination chain is passed then don't find again.
    if (!oThis.sourceChainId || !oThis.destinationChainId) {
      if (oThis.fromOriginToAux) {
        oThis.sourceChainId = oThis.auxChainConfig.originGeth.chainId;
        oThis.destinationChainId = oThis.auxChainConfig.auxGeth.chainId;
      } else {
        oThis.destinationChainId = oThis.auxChainConfig.originGeth.chainId;
        oThis.sourceChainId = oThis.auxChainConfig.auxGeth.chainId;
      }
    }

    oThis.confirmations = chainBlockDelay[oThis.sourceChainId];
  }

  /**
   * Fetch Anchor contract and admin address
   *
   * @return {Object}
   */
  async _fetchAnchorAddresses() {
    const oThis = this;

    let anchorContractKind = null,
      anchorAdminKind = null,
      associatedAuxChainId = null;
    // If destination chain is an auxiliary chain
    if (oThis.destinationChainId == oThis.auxChainId) {
      anchorContractKind = chainAddressConstants.auxAnchorOrgContractKind;
      anchorAdminKind = chainAddressConstants.auxAnchorOrgContractAdminKind;
      associatedAuxChainId = oThis.auxChainId;
    } else {
      anchorContractKind = chainAddressConstants.originAnchorOrgContractKind;
      anchorAdminKind = chainAddressConstants.originAnchorOrgContractAdminKind;
      associatedAuxChainId = 0;
    }

    // Fetch all addresses associated to auxChainId.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: associatedAuxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_srs_b_1',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.anchorContract = chainAddressesRsp.data[anchorContractKind].address;
    oThis.organizationAdmin = chainAddressesRsp.data[anchorAdminKind].address;
  }
}

module.exports = Base;
