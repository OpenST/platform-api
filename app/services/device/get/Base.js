'use strict';

/**
 *  Fetch device details by userId and wallet addresses.
 *
 * @module app/services/device/get/Base
 */

const rootPrefix = '../../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class for get devices base.
 *
 * @class
 */
class Base extends ServiceBase {
  /**
   * Constructor for get devices base.
   *
   * @param {Object} params
   * @param {Integer} params.client_id
   * @param {String} params.user_id: uuid
   * @param {Integer} [params.token_id]
   *
   * @augments ServiceBase
   *
   * @constructor
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

    const returnData = await oThis._getUserDeviceDataFromCache();

    return responseHelper.successWithData(returnData);
  }

  /**
   * Validate and sanitize input parameters.
   *
   * @returns {*}
   *
   * @private
   */
  _sanitizeParams() {
    const oThis = this;

    oThis.userId = oThis.userId.toLowerCase();
  }

  /**
   * Set wallet addresses.
   *
   * @private
   */
  _setWalletAddresses() {
    throw 'sub class to implement and set oThis.walletAddresses';
  }

  /**
   * Get user device data from cache.
   *
   * @returns {Promise<*|result>}
   */
  async _getUserDeviceDataFromCache() {
    throw new Error('sub class to implement.');
  }
}

module.exports = Base;
