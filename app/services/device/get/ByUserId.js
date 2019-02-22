'use strict';
/**
 *  Fetch device details by userId.
 *
 * @module app/services/device/get/ByUserId
 */
const OSTBase = require('@openstfoundation/openst-base');

const rootPrefix = '../../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  GetDeviceBase = require(rootPrefix + '/app/services/device/get/Base'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  pagination = require(rootPrefix + '/lib/globalConstant/pagination');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chain/UserWalletAddress');

/**
 * Class to list devices by userId.
 *
 * @class UserDeviceList
 */
class UserDeviceList extends GetDeviceBase {
  /**
   * Constructor to list devices by userId.
   *
   * @param params
   * @param {String} [params.addresses]: Array of wallet addresses
   * @param {Integer} [params.limit]
   * @param {String} [params.pagination_identifier]: pagination identifier to fetch page
   *
   * @augments GetDeviceBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.addresses = params.addresses;
    oThis.limit = params.limit;
    oThis.paginationIdentifier = params[pagination.paginationIdentifierKey];

    oThis.lastEvaluatedKey = null;
    oThis.page = null;

    oThis.responseMetaData = {
      [pagination.nextPagePayloadKey]: {}
    };
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

    // Parameters in paginationIdentifier take higher precedence
    if (oThis.paginationIdentifier) {
      let parsedPaginationParams = oThis._parsePaginationParams(oThis.paginationIdentifier);
      oThis.addresses = []; //addresses not allowed after first page
      oThis.page = parsedPaginationParams.page; //override page
      oThis.limit = parsedPaginationParams.limit; //override limit
      oThis.lastEvaluatedKey = parsedPaginationParams.lastEvaluatedKey;
    } else {
      oThis.addresses = oThis.addresses || [];
      oThis.page = 1;
      oThis.limit = oThis.limit || oThis._defaultPageLimit();
      oThis.lastEvaluatedKey = null;
    }

    // Validate addresses length
    if (oThis.addresses && oThis.addresses.length > oThis._maxPageLimit()) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_d_gl_buid_1',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['addresses_more_than_allowed_limit'],
          debug_options: {}
        })
      );
    }

    //Validate limit
    return oThis._validatePageSize();
  }

  /**
   * Set wallet addresses.
   *
   * Sets oThis.walletAddresses
   *
   * @private
   */
  async _setWalletAddresses() {
    const oThis = this;

    if (!oThis.addresses || oThis.addresses.length === 0) {
      let response = await oThis._fetchFromCache();
      oThis.walletAddresses = response.data.walletAddresses;
      oThis.responseMetaData[pagination.nextPagePayloadKey] = response.data[pagination.nextPagePayloadKey] || {};
    } else {
      for (let index = 0; index < oThis.addresses.length; index++) {
        oThis.walletAddresses.push(basicHelper.sanitizeAddress(oThis.addresses[index]));
      }
    }
  }

  /**
   * Fetch wallet addresses from cache.
   *
   * @private
   */
  async _fetchFromCache() {
    const oThis = this;

    let UserWalletAddressCache = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'UserWalletAddressCache'),
      userWalletAddressCache = new UserWalletAddressCache({
        userId: oThis.userId,
        tokenId: oThis.tokenId,
        page: oThis.page,
        limit: oThis._currentPageLimit(),
        lastEvaluatedKey: oThis.lastEvaluatedKey
      });

    return userWalletAddressCache.fetch();
  }

  /**
   * Format response
   *
   * @return {*}
   *
   * @private
   */
  _formatApiResponse() {
    const oThis = this;

    return responseHelper.successWithData({
      [resultType.devices]: oThis.deviceDetails,
      [resultType.meta]: oThis.responseMetaData
    });
  }

  /**
   * _defaultPageLimit
   *
   * @private
   */
  _defaultPageLimit() {
    return pagination.defaultDeviceListPageSize;
  }

  /**
   * _minPageLimit
   *
   * @private
   */
  _minPageLimit() {
    return pagination.minDeviceListPageSize;
  }

  /**
   * _maxPageLimit
   *
   * @private
   */
  _maxPageLimit() {
    return pagination.maxDeviceListPageSize;
  }

  /**
   * _currentPageLimit
   *
   * @private
   */
  _currentPageLimit() {
    const oThis = this;

    return oThis.limit;
  }
}

InstanceComposer.registerAsShadowableClass(UserDeviceList, coreConstants.icNameSpace, 'UserDeviceList');

module.exports = {};
