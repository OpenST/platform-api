'use strict';
/**
 * Generate addresses for economy setup.
 *
 * @module lib/generateKnownAddress/token
 */
const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  TokenAddressModel = require(rootPrefix + '/app/models/mysql/TokenAddress'),
  TokenAddressCache = require(rootPrefix + '/lib/sharedCacheManagement/TokenAddress'),
  GenerateAddressBase = require(rootPrefix + '/lib/generateKnownAddress/base');

/**
 * Class to Generate addresses for economy setup.
 *
 * @class
 */
class Token extends GenerateAddressBase {
  /**
   * Generate address constructor
   *
   * @param params {object}
   *
   */
  constructor(params) {
    super(params);
    const oThis = this;
    oThis.tokenId = params.tokenId;
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
    const oThis = this,
      tokenAddressModelObj = new TokenAddressModel();

    const insertedRec = await tokenAddressModelObj
      .insert({
        token_id: oThis.tokenId,
        kind: tokenAddressModelObj.invertedKinds[oThis.addressKind],
        address: oThis.ethAddress,
        known_address_id: knownAddressId
      })
      .fire();

    if (insertedRec.affectedRows == 0) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_gka_t',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    new TokenAddressCache({
      tokenId: oThis.tokenId
    }).clear();

    return responseHelper.successWithData({ chainAddressId: insertedRec.id });
  }
}

module.exports = Token;
