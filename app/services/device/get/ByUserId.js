const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  GetDeviceBase = require(rootPrefix + '/app/services/device/get/Base'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  paginationConstants = require(rootPrefix + '/lib/globalConstant/pagination');

// Following require(s) for registering into instance composer.
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
   * @param {object} params
   * @param {number} params.client_id
   * @param {string} params.user_id
   * @param {number} [params.token_id]
   * @param {array} [params.addresses]: Array of wallet addresses
   * @param {number} [params.limit]
   * @param {string} [params.pagination_identifier]: pagination identifier to fetch page
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
    oThis.paginationIdentifier = params[paginationConstants.paginationIdentifierKey];

    oThis.lastEvaluatedKey = null;
    oThis.page = null;

    oThis.responseMetaData = {
      [paginationConstants.nextPagePayloadKey]: {}
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
      const parsedPaginationParams = oThis._parsePaginationParams(oThis.paginationIdentifier);
      oThis.addresses = []; // Addresses not allowed after first page.
      oThis.page = parsedPaginationParams.page; // Override page.
      oThis.limit = parsedPaginationParams.limit; // Override limit.
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

    // Validate limit.
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
      const response = await oThis._fetchFromCache();
      oThis.walletAddresses = response.data.walletAddresses;
      oThis.responseMetaData[paginationConstants.nextPagePayloadKey] =
        response.data[paginationConstants.nextPagePayloadKey] || {};
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

    const UserWalletAddressCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserWalletAddressCache'),
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
    return paginationConstants.defaultDeviceListPageSize;
  }

  /**
   * _minPageLimit
   *
   * @private
   */
  _minPageLimit() {
    return paginationConstants.minDeviceListPageSize;
  }

  /**
   * _maxPageLimit
   *
   * @private
   */
  _maxPageLimit() {
    return paginationConstants.maxDeviceListPageSize;
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
