'use strict';

/**
 * Generate Internal Addresses
 *
 * @module tools/helpers/GenerateChainKnownAddresses
 */

const rootPrefix = '../..',
  GenerateChainKnownAddress = require(rootPrefix + '/lib/GenerateChainKnownAddress'),
  economyAddressConst = require(rootPrefix + '/lib/globalConstant/economyAddress'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

/**
 * Generate Internal addresses required for setup.
 *
 * @param {object} params - external passed parameters
 * @param {number} params.tokenId - token id
 * @param {string} params.chainKind - chain kind
 * @param {number} params.chainId - chain id
 * @param {string} params.addressKinds - array of types of address to generate
 */
const generateInternalAddressesKlass = function(params) {
  const oThis = this;

  oThis.tokenId = params.tokenId;
  oThis.chainKind = params.chainKind;
  oThis.chainId = params.chainId;
  oThis.addressKinds = [economyAddressConst.ownerKind, economyAddressConst.adminKind, economyAddressConst.workerKind];
};

generateInternalAddressesKlass.prototype = {
  /**
   * Generate addresses.
   *
   * @return {Promise<Array>}
   */
  perform: async function() {
    const oThis = this;

    for (let i = 0; i < oThis.addressKinds.length; i++) {
      if (!economyAddressConst.invertedKinds[oThis.addressKinds[i]]) {
        fail`invalid kind ${oThis.addressKinds[i]}`;
      }
    }

    let addressKindToValueMap = {};

    for (let i = 0; i < oThis.addressKinds.length; i++) {
      let addressKind = oThis.addressKinds[i];

      const generateEthAddress = new GenerateChainKnownAddress({
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
};

module.exports = generateInternalAddressesKlass;
