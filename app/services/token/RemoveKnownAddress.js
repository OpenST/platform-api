'use strict';
/**
 * This service removes known address.
 *
 * @module app/services/token/RemoveKnownAddress
 */
const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  KnownAddressModel = require(rootPrefix + '/app/models/mysql/KnownAddress'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class for generate known address.
 *
 * @class
 */
class RemoveKnownAddress extends ServiceBase {
  /**
   * Constructor for RemoveKnownAddress
   *
   * @constructor
   */
  constructor(params) {
    super();
    const oThis = this;
    oThis.knownAddressId = params.knownAddressId;
  }

  /**
   * Async perform
   *
   * @returns {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    return oThis._removeKnownAddress();
  }

  /**
   * This function removes known address
   *
   * @returns {Promise<void>}
   * @private
   */
  async _removeKnownAddress() {
    const oThis = this,
      knownAddressObj = new KnownAddressModel();

    let deleteKnownAddressRsp = await knownAddressObj
      .delete()
      .where(['id = ?', oThis.knownAddressId])
      .fire();

    if (deleteKnownAddressRsp.affectedRows !== 1) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_t_rka_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            knownAddressId: oThis.knownAddressId
          }
        })
      );
    }
    return responseHelper.successWithData({});
  }
}

module.exports = RemoveKnownAddress;
