'use strict';
/**
 * This service generates known address.
 *
 * @module app/services/token/GenerateKnownAddress
 */
const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  GenerateKnownAddressKlass = require(rootPrefix + '/lib/generateKnownAddress/Address');

/**
 * Class for generate known address.
 *
 * @class
 */
class GenerateKnownAddress extends ServiceBase {
  /**
   * Constructor for GenerateKnownAddress
   *
   * @constructor
   */
  constructor() {
    super();
  }

  /**
   * Async perform
   *
   * @returns {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    return oThis._generateKnownAddress();
  }

  /**
   * This function generates new known address
   *
   * @returns {Promise<void>}
   * @private
   */
  async _generateKnownAddress() {
    const oThis = this,
      generateKnownAddressObj = new GenerateKnownAddressKlass();

    let generateKnownAddressRsp = await generateKnownAddressObj.perform();

    if (generateKnownAddressRsp.isFailure()) {
      return Promise.reject(generateKnownAddressRsp);
    }

    return generateKnownAddressRsp;
  }
}

module.exports = GenerateKnownAddress;
