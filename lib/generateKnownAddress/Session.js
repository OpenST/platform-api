'use strict';
/**
 * Generate addresses for session.
 *
 * @module lib/generateKnownAddress/Session
 */
const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  GenerateAddressBase = require(rootPrefix + '/lib/generateKnownAddress/Base');

/**
 * Class to Generate addresses for session.
 *
 * @class
 */
class Session extends GenerateAddressBase {
  /**
   * Generate address constructor
   *
   * @constructor
   *
   * @param {object} params - external passed parameters
   * @param {number} [params.address] - address to be used
   * @param {number} [params.privateKey] - private key to be used
   *
   */
  constructor(params) {
    super(params);
    const oThis = this;
    oThis.knownAddressId = null;
  }

  /**
   *
   * insert into token addresses table
   *
   * @private
   *
   * @param {number} knownAddressId
   *
   * @return {Result}
   */
  async insertIntoTable(knownAddressId) {
    // DO Nothing here as we would insert in bulk later
    const oThis = this;
    oThis.knownAddressId = knownAddressId;
    return responseHelper.successWithData({});
  }

  /**
   * prepare response data.
   */
  prepareResponseData() {
    const oThis = this;
    oThis.responseData = {
      address: oThis.ethAddress,
      knownAddressId: oThis.knownAddressId
    };
  }
}

module.exports = Session;
