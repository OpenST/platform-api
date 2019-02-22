'use strict';

/**
 *  Fetch device details by userId and wallet addresses.
 *
 * @module app/services/device/get/Base
 */

const rootPrefix = '../../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

require(rootPrefix + '/lib/cacheManagement/chain/PreviousOwnersMap');
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
   * @param {String} params.user_id
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
  }

  /**
   * Async performer
   *
   * @returns {Promise<*|result>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._validateAndSanitizeParams();

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
  async _validateAndSanitizeParams() {
    const oThis = this;
  }

  /**
   * fetch linked device addresses for specified user id
   * @returns {Promise<*>}
   * @private
   */
  async _fetchLinkedDeviceAddressMap() {
    const oThis = this;

    let PreviousOwnersMapCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'PreviousOwnersMap'),
      previousOwnersMapObj = new PreviousOwnersMapCache({ userId: oThis.userId, tokenId: oThis.tokenId }),
      previousOwnersMapRsp = await previousOwnersMapObj.fetch();

    if (previousOwnersMapRsp.isFailure()) {
      logger.error('Error in fetching linked addresses');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_d_g_b_1',
          api_error_identifier: 'cache_issue',
          debug_options: {}
        })
      );
    }

    return previousOwnersMapRsp.data;
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
