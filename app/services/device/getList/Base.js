'use strict';

/**
 *  Fetch device details by userId and wallet addresses.
 *
 * @module app/services/device/getList/Base
 */

const rootPrefix = '../../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chainMulti/DeviceDetail');

class GetListBase extends ServiceBase {
  /**
   * @param params
   * @param {Integer} params.client_id
   * @param {String} params.user_id - uuid
   * @param {Integer} [params.token_id]
   */
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.clientId = params.client_id;
    oThis.userId = params.user_id;
    oThis.tokenId = params.token_id;

    oThis.walletAddresses = [];
    oThis.nextPagePayload = null;
  }

  /**
   * Async performer
   *
   * @returns {Promise<*|result>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._sanitizeParams();

    if (!oThis.tokenId) {
      await oThis._fetchTokenDetails();
    }

    await oThis._setWalletAddresses();

    let response = await oThis._getUserDeviceDataFromCache();

    let returnData = {
      [resultType.devices]: response.data
    };

    if (oThis.nextPagePayload) {
      returnData[resultType.nextPagePayload] = oThis.nextPagePayload;
    }

    return responseHelper.successWithData(returnData);
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

    return response;
  }
}

module.exports = GetListBase;
