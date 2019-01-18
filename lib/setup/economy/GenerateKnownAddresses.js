'use strict';
/**
 * Generate Internal Addresses for economy setup
 *
 * @module tools/helpers/GenerateChainKnownAddresses
 */

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  TokenAddressModel = require(rootPrefix + '/app/models/mysql/TokenAddress'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  tokenAddressConstant = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  GenerateTokenAddress = require(rootPrefix + '/lib/generateKnownAddress/Token');

/**
 * Class to generate addresses for economy setup.
 *
 * @class
 */
class GenerateInternalAddresses {
  /**
   * Generate Internal addresses required for setup.
   *
   * @constructor
   *
   * @param {object} params - external passed parameters
   * @param {number} params.tokenId - token id
   * @param {string} params.chainKind - chain kind
   * @param {number} params.chainId - chain id
   */

  constructor(params) {
    const oThis = this;
    oThis.tokenId = params.tokenId;
    oThis.chainId = params.chainId;
    oThis.addressKinds = [tokenAddressConstant.adminAddressKind, tokenAddressConstant.workerAddressKind];
  }

  /**
   * Generate addresses.
   *
   * @return {Promise<Array>}
   */
  async perform() {
    const oThis = this;

    // await oThis._copyOverTokenAdminAddress();

    return oThis._generateAddresses();
  }

  /**
   * Copy over tokenAdmin addresses from chain addresses into token address
   *
   * @return {Promise<Array>}
   */
  async _copyOverTokenAdminAddress() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.chainId,
      kinds: [
        chainAddressConstants.deployerKind,
        chainAddressConstants.messageBusLibKind,
        chainAddressConstants.gatewayLibKind
      ]
    });

    let auxKindToAddressMap = fetchAddrRsp.data;

    oThis.deployerAddress = auxKindToAddressMap.address[chainAddressConstants.deployerKind];
    oThis.messageBusAddress = auxKindToAddressMap.address[chainAddressConstants.messageBusLibKind];
  }

  /**
   * Generate addresses.
   *
   * @return {Promise<Array>}
   */
  async _generateAddresses() {
    const oThis = this,
      tokenAddressModelObj = new TokenAddressModel();
    for (let i = 0; i < oThis.addressKinds.length; i++) {
      if (!tokenAddressModelObj.invertedKinds[oThis.addressKinds[i]]) {
        fail`invalid kind ${oThis.addressKinds[i]}`;
      }
    }

    let addressKindToValueMap = {};

    for (let i = 0; i < oThis.addressKinds.length; i++) {
      let addressKind = oThis.addressKinds[i];
      const generateEthAddress = new GenerateTokenAddress({
        tokenId: oThis.tokenId,
        addressKind: addressKind,
        chainId: oThis.chainId
      });

      let r = await generateEthAddress.perform();

      if (r.isFailure()) {
        logger.error('Address generation failed ============ ', r);
        process.exit(0);
      }
      Object.assign(addressKindToValueMap, r.data);
    }
    return responseHelper.successWithData({ taskDone: 1, addressKindToValueMap: addressKindToValueMap });
  }
}

module.exports = GenerateInternalAddresses;
