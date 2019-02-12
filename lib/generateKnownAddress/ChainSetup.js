'use strict';
/**
 *
 *  Base to generate addresses
 *
 * @module lib/generateKnownAddress/ChainSetup
 */

const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  GenerateAddressBase = require(rootPrefix + '/lib/generateKnownAddress/Base'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress');

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
   * @param {string} params.addressKind - type of address
   *
   */
  constructor(params) {
    super(params);
    const oThis = this;
    oThis.chainId = params.chainId;
    oThis.chainKind = params['chainKind'];
    oThis.addressKind = params['addressKind'];
    oThis.associatedAuxChainId = oThis.chainKind === coreConstants.auxChainKind ? oThis.chainId : 0;
  }

  /**
   * Insert into chain addresses table.
   *
   * @param {Number} knownAddressId
   *
   * @return Promise<void>
   */
  async insertIntoTable(knownAddressId) {
    const oThis = this;
    const insertedRec = await new ChainAddressModel().insertAddress({
      associatedAuxChainId: oThis.associatedAuxChainId,
      addressKind: oThis.addressKind,
      address: oThis.ethAddress,
      knownAddressId: knownAddressId,
      status: chainAddressConstants.activeStatus
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

    // Clear chain address cache.
    await new ChainAddressCache({ associatedAuxChainId: oThis.associatedAuxChainId }).clear();

    return responseHelper.successWithData({ chainAddressId: insertedRec.id });
  }

  /**
   * prepare response data.
   */
  prepareResponseData() {
    const oThis = this;
    oThis.responseData = {
      [oThis.addressKind]: oThis.ethAddress
    };
  }
}

module.exports = ChainSetup;
