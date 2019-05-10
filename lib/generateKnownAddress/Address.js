'use strict';
/**
 * Generate address.
 *
 * @module lib/generateKnownAddress/token
 */
const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  GenerateAddressBase = require(rootPrefix + '/lib/generateKnownAddress/Base');

/**
 * Class to Generate address
 *
 * @class
 */
class Address extends GenerateAddressBase {
  /**
   * Generate address constructor
   *
   * @constructor
   */
  constructor() {
    super({});
  }

  /**
   *
   * @private
   * @param {number} knownAddressId
   *
   * @return {Result}
   */
  async insertIntoTable(knownAddressId) {
    const oThis = this;

    oThis.knownAddressId = knownAddressId; //No need to insert anything in any table here. Need known address id in response data.
    return responseHelper.successWithData({});
  }

  /**
   * prepare response data.
   */
  prepareResponseData() {
    const oThis = this;
    oThis.responseData = {
      address: oThis.ethAddress,
      known_address_id: oThis.knownAddressId
    };
  }
}

module.exports = Address;
