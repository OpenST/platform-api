'use strict';
/**
 * Generate Internal Addresses for economy setup
 *
 * @module tools/helpers/GenerateChainKnownAddresses
 */

const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  TokenAddressModel = require(rootPrefix + '/app/models/mysql/TokenAddress'),
  TokenAddressConstant = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  GenerateChainKnownAddress = require(rootPrefix + '/lib/generateKnownAddress/token');

/**
 * Class to generate addresses for economy setup.
 *
 * @class
 */
class generateInternalAddresses {
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
    oThis.chainKind = params.chainKind;
    oThis.chainId = params.chainId;
    oThis.addressKinds = [
      TokenAddressConstant.ownerAddressKind,
      TokenAddressConstant.adminAddressKind,
      TokenAddressConstant.workerAddressKind
    ];
  }

  /**
   * Generate addresses.
   *
   * @return {Promise<Array>}
   */
  async perform() {
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
      const generateEthAddress = new GenerateChainKnownAddress({
        tokenId: oThis.tokenId,
        addressKind: addressKind,
        chainKind: oThis.chainKind,
        chainId: oThis.chainId
      });

      let r = await generateEthAddress.perform();

      if (r.isFailure()) {
        logger.error('Address generation failed ============ ', r);
        process.exit(0);
      }
      Object.assign(addressKindToValueMap, r.data);
    }
    return responseHelper.successWithData({ addressKindToValueMap: addressKindToValueMap });
  }
}

module.exports = generateInternalAddresses;
