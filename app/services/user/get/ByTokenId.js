'use strict';

const OSTBase = require('@ostdotcom/base');

const rootPrefix = '../../../..',
  GetUserBase = require(rootPrefix + '/app/services/user/get/Base'),
  pagination = require(rootPrefix + '/lib/globalConstant/pagination'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  basicHelper = require(rootPrefix + '/helpers/basic');

const InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/lib/cacheManagement/chain/TokenUserId');

class GetUserList extends GetUserBase {
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.ids = params.ids;
    oThis.limit = params.limit;
    oThis.paginationIdentifier = params[pagination.paginationIdentifierKey];

    oThis.lastEvaluatedKey = null;
    oThis.page = null;
    oThis.userIds = [];

    oThis.responseMetaData = {
      [pagination.nextPagePayloadKey]: {}
    };
  }

  /**
   * Validate and sanitize specific params
   *
   * @returns {Promise<never>}
   * @private
   */
  async _validateAndSanitizeParams() {
    const oThis = this;

    // Parameters in paginationIdentifier take higher precedence
    if (oThis.paginationIdentifier) {
      let parsedPaginationParams = oThis._parsePaginationParams(oThis.paginationIdentifier);
      oThis.ids = []; //user ids not allowed after first page
      oThis.page = parsedPaginationParams.page; //override page
      oThis.limit = parsedPaginationParams.limit; //override limit
      oThis.lastEvaluatedKey = parsedPaginationParams.lastEvaluatedKey;
    } else {
      oThis.ids = oThis.ids || [];
      oThis.page = 1;
      oThis.limit = oThis.limit || pagination.defaultUserListPageSize;
      oThis.lastEvaluatedKey = null;
    }

    // Validate user ids length
    if (oThis.ids && oThis.ids.length > pagination.maxUserListPageSize) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 's_u_gl_1',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['ids_more_than_allowed_limit'],
          debug_options: {}
        })
      );
    }

    //Validate limit
    return await oThis._validatePageSize();
  }

  /**
   * set user ids - by hitting pagination cache
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _setUserIds() {
    const oThis = this;

    if (!oThis.ids || oThis.ids.length === 0) {
      let response = await oThis._fetchFromCache();
      oThis.userIds = response.data.userIds;
      oThis.responseMetaData[pagination.nextPagePayloadKey] = response.data[pagination.nextPagePayloadKey] || {};
    } else {
      for (let index = 0; index < oThis.ids.length; index++) {
        oThis.userIds.push(basicHelper.sanitizeuuid(oThis.ids[index]));
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

    let TokenUserIdCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserIdCache'),
      tokenUserIdCache = new TokenUserIdCache({
        tokenId: oThis.tokenId,
        page: oThis.page,
        limit: oThis._currentPageLimit(),
        lastEvaluatedKey: oThis.lastEvaluatedKey
      });

    return tokenUserIdCache.fetch();
  }

  /**
   * Format API response
   *
   * @return {Promise<*|result>}
   * @private
   */
  async _formatApiResponse() {
    const oThis = this;

    return responseHelper.successWithData({
      [resultType.users]: oThis.userDetails,
      [resultType.meta]: oThis.responseMetaData
    });
  }

  /**
   * _defaultPageLimit
   *
   * @private
   */
  _defaultPageLimit() {
    return pagination.defaultUserListPageSize;
  }

  /**
   * _minPageLimit
   *
   * @private
   */
  _minPageLimit() {
    return pagination.minUserListPageSize;
  }

  /**
   * _maxPageLimit
   *
   * @private
   */
  _maxPageLimit() {
    return pagination.maxUserListPageSize;
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

InstanceComposer.registerAsShadowableClass(GetUserList, coreConstants.icNameSpace, 'GetUserList');
