'use strict';

/**
 *  Fetch device details by userId and wallet addresses.
 *
 * @module app/services/device/getList/Base
 */

const rootPrefix = '../../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  TokenDetailCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Token'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chainMulti/DeviceDetail');

class GetListBase {
  /**
   * @param params
   * @param {Integer} params.client_id
   * @param {String} params.user_id - uuid
   * @param {Integer} [params.token_id]
   */
  constructor(params) {
    const oThis = this;
    oThis.clientId = params.client_id;
    oThis.userId = params.user_id;
    oThis.tokenId = params.token_id;

    oThis.walletAddresses = [];
  }

  /**
   * Main performer method.
   *
   * @returns {Promise<void>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(err) {
      logger.error(`unhandled_catch in ${__filename}`, err);

      return responseHelper.error({
        internal_error_identifier: 'a_s_d_gl_b_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: { error: err.toString() }
      });
    });
  }

  /**
   * Async performer
   *
   * @returns {Promise<*|result>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._sanitizeParams();

    await oThis._setTokenId();

    await oThis._setWalletAddresses();

    return await oThis._getUserDeviceDataFromCache();
  }

  /**
   * Validate and sanitize input parameters.
   *
   * @returns {*}
   * @private
   */
  _sanitizeParams() {
    const oThis = this;
    oThis.userId = oThis.userId.toLowerCase();
  }

  /**
   *
   * set token id if not passed in params
   *
   * @private
   */
  async _setTokenId() {
    const oThis = this;

    if (oThis.tokenId) {
      return;
    }

    let cacheResponse = await new TokenDetailCache({ clientId: oThis.clientId }).fetch();

    if (cacheResponse.isFailure() || !cacheResponse.data) {
      logger.error('Could not fetched token details.');
      return Promise.reject(cacheResponse);
    }

    oThis.tokenId = cacheResponse.data['id'];
  }

  /**
   * @private
   */
  _setWalletAddresses() {
    throw 'sub class to implement and set oThis.walletAddresses';
  }

  /**
   * Async performer
   *
   * @returns {Promise<*|result>}
   */
  async _getUserDeviceDataFromCache() {
    const oThis = this;

    let DeviceDetailCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'DeviceDetailCache'),
      deviceDetailCache = new DeviceDetailCache({
        userId: oThis.userId,
        tokenId: oThis.tokenId,
        walletAddresses: oThis.walletAddresses
      }),
      response = await deviceDetailCache.fetch();

    if (response.isFailure()) {
      return Promise.reject(response);
    }

    return responseHelper.successWithData({ [resultType.devices]: response.data });
  }
}

module.exports = GetListBase;
