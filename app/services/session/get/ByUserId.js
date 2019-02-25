'use strict';
/**
 *  Fetch session details by userId.
 *
 * @module app/services/session/get/ByUserId
 */

const OSTBase = require('@openstfoundation/openst-base');

const rootPrefix = '../../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  pagination = require(rootPrefix + '/lib/globalConstant/pagination'),
  GetSessionBase = require(rootPrefix + '/app/services/session/get/Base'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/models/ddb/sharded/Session');
require(rootPrefix + '/lib/cacheManagement/chain/UserSessionAddress');

/**
 * Class to list sessions by userId.
 *
 * @class UserSessionList
 */
class UserSessionList extends GetSessionBase {
  /**
   * @param params
   * @param {Array} [params.addresses]
   * @param {Integer} [params.limit]
   * @param {String} [params.pagination_identifier] - pagination identifier to fetch page
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

    if (oThis.addresses && oThis.addresses.length > oThis._maxPageLimit()) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 's_s_l_bui_1',
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
   * Set addresses for fetching session details
   *
   * Sets oThis.sessionAddresses
   *
   * @private
   */
  async _setSessionAddresses() {
    const oThis = this;

    if (!oThis.addresses || oThis.addresses.length === 0) {
      let response = await oThis._fetchFromCache();
      oThis.sessionAddresses = response.data.addresses;
      oThis.responseMetaData[pagination.nextPagePayloadKey] = response.data[pagination.nextPagePayloadKey] || {};
    } else {
      for (let index = 0; index < oThis.addresses.length; index++) {
        oThis.sessionAddresses.push(basicHelper.sanitizeAddress(oThis.addresses[index]));
      }
    }
  }

  /**
   * fetch user sessions from cache
   *
   * @private
   */
  async _fetchFromCache() {
    const oThis = this;

    let UserSessionAddressCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserSessionAddressCache'),
      userSessionAddressCache = new UserSessionAddressCache({
        userId: oThis.userId,
        tokenId: oThis.tokenId,
        shardNumber: oThis.sessionShardNumber,
        page: oThis.page,
        limit: oThis._currentPageLimit(),
        lastEvaluatedKey: oThis.lastEvaluatedKey
      });

    return userSessionAddressCache.fetch();
  }

  /**
   * Format API response
   *
   * @return {*}
   * @private
   */
  _formatApiResponse() {
    const oThis = this;
    return responseHelper.successWithData({
      [resultType.sessions]: oThis.sessionDetails,
      [resultType.meta]: oThis.responseMetaData
    });
  }

  /**
   * _defaultPageLimit
   *
   * @private
   */
  _defaultPageLimit() {
    return pagination.defaultSessionPageSize;
  }

  /**
   * _minPageLimit
   *
   * @private
   */
  _minPageLimit() {
    return pagination.minSessionPageSize;
  }

  /**
   * _maxPageLimit
   *
   * @private
   */
  _maxPageLimit() {
    return pagination.maxSessionPageSize;
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

InstanceComposer.registerAsShadowableClass(UserSessionList, coreConstants.icNameSpace, 'UserSessionList');

module.exports = {};
