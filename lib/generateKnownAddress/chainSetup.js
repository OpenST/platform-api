'use strict';
/**
 *
 *  Base to generate addresses
 *
 * @module lib/generateKnownAddress/chainSetup
 */

const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  GenerateAddressBase = require(rootPrefix + '/lib/generateKnownAddress/base'),
  chainAddressConst = require(rootPrefix + '/lib/globalConstant/chainAddress');

/**
 * Class to generate addresses for chainSetup
 *
 * @class
 */
class ChainSetup extends GenerateAddressBase {
  /**
   * Generate address constructor
   *
   * @param params {object}
   *
   */
  constructor(params) {
    super(params);
    const oThis = this;
    oThis.chainId = params.chainId;
  }

  /**
   *
   * insert chain address
   *
   * @private
   *
   * @param {number} knownAddressId
   *
   * @return {Result}
   */
  async insertIntoTable(knownAddressId) {
    const oThis = this;

    const insertedRec = await new ChainAddressModel()
      .insert({
        chain_id: oThis.chainId,
        kind: chainAddressConst.invertedKinds[oThis.addressKind],
        chain_kind: chainAddressConst.invertedChainKinds[oThis.chainKind],
        address: oThis.ethAddress,
        known_address_id: knownAddressId,
        status: chainAddressConst.invertedStatuses[chainAddressConst.activeStatus]
      })
      .fire();

    if (insertedRec.affectedRows == 0) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_gka_cs_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return responseHelper.successWithData({ chainAddressId: insertedRec.id });
  }
}

module.exports = ChainSetup;
