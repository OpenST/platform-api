'use strict';
/**
 * This service fetches list of users for given token.
 *
 * @module app/services/user/GetList
 */
const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  pagination = require(rootPrefix + '/lib/globalConstant/pagination'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/models/ddb/sharded/User');
require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

class GetUsersList extends ServiceBase {
  /**
   * @constructor
   *
   * @param {Object} params
   * @param {Number} params.client_id - client Id
   * @param {Number} [params.token_id] - token Id
   * @param {Array} [params.ids] - filter by user uuids.
   * @param {Array} [params.limit] - limit
   * @param {String} [params.pagination_identifier] - pagination identifier to fetch page
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.tokenId = params.token_id;
    oThis.userIds = params.ids || [];
    oThis.limit = params.limit || oThis._defaultPageLimit();
    oThis.paginationIdentifier = params[pagination.paginationIdentifierKey];

    oThis.userShard = null;
    oThis.lastEvaluatedKey = null;

    oThis.responseMetaData = {
      [pagination.nextPagePayloadKey]: {}
    };
  }

  /**
   * perform - Perform Get user lists
   *
   * @return {Promise<void>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._validateAndSanitizeParams();

    if (!oThis.tokenId) {
      await oThis._fetchTokenDetails();
    }

    await oThis._fetchTokenUsersShards();

    await oThis._fetchUserIdsFromDdb();

    return oThis._fetchUsersFromCache();
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
      oThis.userIds = [];
      oThis.limit = parsedPaginationParams.limit; //override limit
      oThis.lastEvaluatedKey = parsedPaginationParams.lastEvaluatedKey;
    }

    // Validate user ids length
    if (oThis.userIds && oThis.userIds.length > oThis._maxPageLimit()) {
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
   * _fetchTokenUsersShards - fetch token user shards from cache
   *
   * Sets oThis.userShard
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchTokenUsersShards() {
    const oThis = this;

    let TokenShardNumbersCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenShardNumbersCache');
    let tokenShardNumbersCache = new TokenShardNumbersCache({
      tokenId: oThis.tokenId
    });

    let response = await tokenShardNumbersCache.fetch();

    oThis.userShard = response.data.user;
  }

  /**
   * _fetchUsersFromDdb
   *
   * Sets oThis.userIds
   * Sets oThis.responseNextPagePayload
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchUserIdsFromDdb() {
    const oThis = this;

    if (!oThis.userIds || oThis.userIds.length === 0) {
      const UserModelKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserModel');

      let userModelObj = new UserModelKlass({ shardNumber: oThis.userShard }),
        response = await userModelObj.getUserIds(oThis.tokenId, oThis._currentPageLimit(), oThis.lastEvaluatedKey);

      // If user ids are found from Dynamo then fetch data from cache.
      if (response.isSuccess() && response.data.users.length > 0) {
        for (let i = 0; i < response.data.users.length; i++) {
          oThis.userIds.push(response.data.users[i].userId);
        }
        oThis.responseMetaData[pagination.nextPagePayloadKey] = response.data[pagination.nextPagePayloadKey] || {};
      }
    }
  }

  /**
   * Fetch user details.
   *
   * @return {Promise<string>}
   */
  async _fetchUsersFromCache() {
    const oThis = this,
      TokenUserDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
      tokenUserDetailsCacheObj = new TokenUserDetailsCache({ tokenId: oThis.tokenId, userIds: oThis.userIds });

    let cacheResponse = await tokenUserDetailsCacheObj.fetch();

    let users = [];
    if (cacheResponse.isSuccess()) {
      let usersData = cacheResponse.data;
      for (let index in oThis.userIds) {
        let uuid = oThis.userIds[index];
        if (!basicHelper.isEmptyObject(usersData[uuid])) {
          users.push(usersData[uuid]);
        }
      }
    }

    return responseHelper.successWithData({
      [resultType.users]: users,
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

InstanceComposer.registerAsShadowableClass(GetUsersList, coreConstants.icNameSpace, 'GetUsersList');

module.exports = {};
