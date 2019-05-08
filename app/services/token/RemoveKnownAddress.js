'use strict';
/**
 * This service removes known address.
 *
 * @module app/services/token/RemoveKnownAddress
 */
const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  TokenAddressModel = require(rootPrefix + '/app/models/mysql/TokenAddress'),
  KnownAddressModel = require(rootPrefix + '/app/models/mysql/KnownAddress'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
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
   * @param params
   * @param params.client_id {number} - client id
   * @param params.known_address_id {number} - known address id
   *
   * @constructor
   */
  constructor(params) {
    super();
    const oThis = this;
    oThis.clientId = params.client_id;
    oThis.knownAddressId = params.known_address_id;
  }

  /**
   * Async perform
   *
   * @returns {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._validate();

    return oThis._removeKnownAddress();
  }

  async _validate() {
    const oThis = this;

    //Check if known address id is same as that of token address
    await oThis._fetchTokenDetails();

    await oThis._fetchTokenOwnerAddress();
  }

  async _fetchTokenOwnerAddress() {
    const oThis = this;

    let params = {
        tokenId: oThis.token.id,
        kind: new TokenAddressModel().invertedKinds[tokenAddressConstants.ownerAddressKind]
      },
      queryResponse = await new TokenAddressModel().getAddressByTokenIdAndKind(params);

    if (queryResponse.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_t_rka_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            params: params
          }
        })
      );
    }

    let knownAddressId = queryResponse.data.known_address_id;

    if (knownAddressId !== oThis.knownAddressId) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_t_rka_3',
          api_error_identifier: 'unauthorized_api_request',
          debug_options: {
            known_address_id: oThis.knownAddressId
          }
        })
      );
    }
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
