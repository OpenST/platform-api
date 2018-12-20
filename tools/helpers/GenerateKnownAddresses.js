'use strict';

/**
 * Generate Internal Addresses
 *
 * @module tools/helpers/GenerateKnownAddresses
 */

const rootPrefix = '../..',
  GenerateKnownAddress = require(rootPrefix + '/lib/GenerateKnownAddress'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

/**
 * Generate Internal addresses required for setup.
 *
 * @param {object} params -
 *                  addressCount - number of addresses to generate.
 *                  kind - type fo address
 *                  chainId - chain for this this would be used
 */
const generateInternalAddressesKlass = function(params) {
  const oThis = this;

  oThis.addrGenerationCount = params.addressCount;
  oThis.kind = params.kind;
  oThis.chainId = params.chainId;
};

generateInternalAddressesKlass.prototype = {
  /**
   * Generate addresses.
   *
   * @return {Promise<Array>}
   */
  perform: async function() {
    const oThis = this;

    let addressesArr = [];

    for (let i = 0; i < oThis.addrGenerationCount; i++) {
      const generateEthAddress = new GenerateKnownAddress({
        kind: oThis.kind,
        chainId: oThis.chainId
      });

      let r = await generateEthAddress.perform();

      if (r.isFailure()) {
        logger.error('Address generation failed ============ ', r);
        process.exit(0);
      }

      addressesArr.push(r.data['address']);
    }

    return Promise.resolve(addressesArr);
  }
};

module.exports = generateInternalAddressesKlass;
