'use strict';
/**
 *
 *  Base to generate addresses
 *
 * @module lib/generateKnownAddress/ChainSetup
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
   * @param {string} params.chainId - chain kind
   * @param {string} params.chainKind - chain kind
   *
   */
  constructor(params) {
    super(params);
    const oThis = this;
    oThis.chainId = params.chainId;
    oThis.chainKind = params['chainKind'];
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
    const insertedRec = await new ChainAddressModel().insertAddress({
      address: oThis.ethAddress,
      chainId: oThis.chainId,
      chainKind: oThis.chainKind,
      kind: oThis.addressKind,
      knownAddressId: knownAddressId,
      status: chainAddressConst.activeStatus
    });

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

  async insertIntoKnownAddressTable(address, privateKey) {
    const oThis = this;

    oThis.ethAddress = address;
    oThis.privateKeyD = privateKey;

    return Promise.resolve(responseHelper.successWithData());
  }
}

module.exports = ChainSetup;
