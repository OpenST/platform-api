'use strict';

/**
 * Generate Internal Addresses
 *
 * @module tools/helpers/GenerateChainKnownAddresses
 */

const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainAddressConst = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  GenerateChainKnownAddress = require(rootPrefix + '/lib/generateKnownAddress/ChainSetup');

class generateInternalAddresses {
  /**
   * Generate Internal addresses required for setup.
   *
   * @constructor
   *
   * @param {object} params - external passed parameters
   * @param {string} params.addressKinds - array of types of address to generate
   * @param {string} params.chainKind - chain kind
   * @param {number} params.chainId - chain id
   */

  constructor(params) {
    const oThis = this;
    oThis.addressKinds = params.addressKinds;
    oThis.chainKind = params.chainKind;
    oThis.chainId = params.chainId;
  }

  /**
   * Generate addresses.
   *
   * @return {Promise<Array>}
   */
  async perform() {
    const oThis = this;

    for (let i = 0; i < oThis.addressKinds.length; i++) {
      if (!chainAddressConst.invertedKinds[oThis.addressKinds[i]]) {
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
}

module.exports = generateInternalAddresses;
