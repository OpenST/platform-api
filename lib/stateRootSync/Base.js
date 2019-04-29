/**
 * Base module to commit state root of chain to anchor contract of another chain.
 *
 * @module lib/stateRootSync/Base
 */

const MosaicAnchor = require('@openstfoundation/mosaic-anchor.js');

const rootPrefix = '../..',
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');

/**
 * Base class to commit state root of chain to anchor contract of another chain.
 *
 * @class Base
 */
class Base {
  /**
   * Constructor to commit state root of chain to anchor contract of another chain.
   *
   * @param {object} params
   * @param {number} params.auxChainId: Auxiliary Chain Id with respect to which operation would happen.
   * @param {number} params.blockNumber: Block Number to sync state root for.
   * @param {number} params.sourceChainId: Source Chain Id for which state root sync is started.
   * @param {number} params.destinationChainId: Destination Chain Id where state root would be synced.
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.blockNumber = params.blockNumber;
    oThis.sourceChainId = params.sourceChainId;
    oThis.destinationChainId = params.destinationChainId;

    oThis.auxChainConfig = null;
    oThis.chainProviders = {};
    oThis.gasPrice = contractConstants.zeroGasPrice;
  }

  /**
   * Create mosaic anchor object.
   *
   * @return {Promise<MosaicAnchor.Anchor>}
   * @private
   */
  async _createMosaicAnchorObj() {
    const oThis = this;

    await oThis._fetchAuxChainConfig();

    await oThis._fetchChainSpecificData();

    const shuffledSourceProviders = basicHelper.shuffleArray(oThis.chainProviders[oThis.sourceChainId]);
    const shuffledDestinationProviders = basicHelper.shuffleArray(oThis.chainProviders[oThis.destinationChainId]);

    const sourceProvider = shuffledSourceProviders[0],
      destProvider = shuffledDestinationProviders[0],
      destinationWeb3 = web3Provider.getInstance(destProvider).web3WsProvider;

    oThis.sourceWeb3 = web3Provider.getInstance(sourceProvider).web3WsProvider;
    oThis.destinationChainUrl = destProvider;

    oThis.txOptions = {
      gasPrice: oThis.gasPrice,
      gas: contractConstants.commitStateRootGas,
      chainId: oThis.destinationChainId,
      value: '0x00',
      from: oThis.organizationAdmin,
      to: oThis.anchorContract
    };

    return new MosaicAnchor.Anchor(
      oThis.sourceWeb3,
      destinationWeb3,
      oThis.anchorContract,
      oThis.organizationAdmin,
      oThis.confirmations,
      oThis.txOptions
    );
  }

  /**
   * Fetch config for aux chain.
   *
   * @sets oThis.auxChainConfig, oThis.confirmations, oThis.chainProviders
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchAuxChainConfig() {
    const oThis = this,
      rsp = await chainConfigProvider.getFor([oThis.auxChainId]);

    oThis.auxChainConfig = rsp[oThis.auxChainId];

    const chainBlockDelay = {};

    oThis.chainProviders[oThis.auxChainConfig.originGeth.chainId] =
      oThis.auxChainConfig.originGeth.readWrite.wsProviders;
    oThis.chainProviders[oThis.auxChainConfig.auxGeth.chainId] = oThis.auxChainConfig.auxGeth.readWrite.wsProviders;

    chainBlockDelay[oThis.auxChainConfig.originGeth.chainId] = oThis.auxChainConfig.originGeth.finalizeAfterBlocks;
    chainBlockDelay[oThis.auxChainConfig.auxGeth.chainId] = oThis.auxChainConfig.auxGeth.finalizeAfterBlocks;

    oThis.confirmations = chainBlockDelay[oThis.sourceChainId];
  }

  /**
   * Fetch anchor contract and admin address.
   *
   * @sets oThis.gasPrice
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchChainSpecificData() {
    const oThis = this;

    let anchorContractKind = null,
      anchorAdminKind = null;

    // If destination chain is an auxiliary chain.
    if (oThis.destinationChainId == oThis.auxChainId) {
      oThis.gasPrice = contractConstants.auxChainGasPrice;
      anchorContractKind = chainAddressConstants.auxAnchorContractKind;
      anchorAdminKind = chainAddressConstants.auxAnchorOrgContractAdminKind;
      await oThis._fetchAuxChainAddresses(anchorContractKind, anchorAdminKind);
    } else {
      oThis.gasPrice = contractConstants.defaultOriginChainGasPrice;
      anchorContractKind = chainAddressConstants.originAnchorContractKind;
      anchorAdminKind = chainAddressConstants.originAnchorOrgContractAdminKind;
      /* We are fetching origin anchor contract kind from aux chain addresses because it is
      associated to an aux chain id. Origin anchor org contract admin kind is associated to origin chainId.
       */
      await oThis._fetchAuxChainAddresses(anchorContractKind);
      await oThis._fetchOriginChainAddresses(anchorAdminKind);
    }
  }

  /**
   * Fetch all addresses associated to auxChainId.
   *
   * @param {string} anchorContractKind
   * @param {string} [anchorAdminKind]
   *
   * @sets oThis.anchorContract, [oThis.organizationAdmin]
   *
   * @return {Promise<never>}
   * @private
   */
  async _fetchAuxChainAddresses(anchorContractKind, anchorAdminKind) {
    const oThis = this;

    // Fetch all addresses associated to auxChainId.
    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
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

    if (anchorAdminKind) {
      oThis.organizationAdmin = chainAddressesRsp.data[anchorAdminKind].address;
    }
  }

  /**
   * Fetch all addresses associated to origin chain id.
   *
   * @param {string} anchorAdminKind
   *
   * @sets oThis.organizationAdmin
   *
   * @return {Promise<never>}
   * @private
   */
  async _fetchOriginChainAddresses(anchorAdminKind) {
    const oThis = this;

    // Fetch all addresses associated to origin chain id.
    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_srs_b_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.organizationAdmin = chainAddressesRsp.data[anchorAdminKind].address;
  }
}

module.exports = Base;
