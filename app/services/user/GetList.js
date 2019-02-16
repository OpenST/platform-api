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
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  pagination = require(rootPrefix + '/lib/globalConstant/pagination'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

const InstanceComposer = OSTBase.InstanceComposer;

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/models/ddb/sharded/User');
require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

class GetUsersList extends ServiceBase {
  /**
   * @constructor
   *
   * @param params
   * @param params.client_id {Number} - client Id
   * @param params.token_id {Number} - token Id
   * @param {String} params.pagination_identifier - pagination identifier to fetch page
   * @param {Integer} [params.limit] - number of results to be returned on this page
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.tokenId = params.token_id;
    oThis.paginationIdentifier = params.pagination_identifier;
    oThis.limit = params.limit || oThis._defaultPageSize();
    oThis.userIds = params.ids || [];

    oThis.userShard = null;
    oThis.paginationParams = null;
  }

  /**
   * perform - Perform Get user lists
   *
   * @return {Promise<void>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._validateParams();

    if (!oThis.tokenId) {
      await oThis._fetchTokenDetails();
    }

    await oThis._validatePaginationParams();

    await oThis._fetchTokenUsersShards();

    let responseData = {};
    if (oThis.userIds.length === 0) {
      let response = await oThis._fetchUserIdsFromDdb();

      // If user ids are found from Dynamo then fetch data from cache.
      if (response.isSuccess() && response.data.users.length > 0) {
        for (let i = 0; i < response.data.users.length; i++) {
          oThis.userIds.push(response.data.users[i].userId);
        }
      }
      responseData = response.data;
    }

    let cacheResponse = await oThis._fetchUsersFromCache(oThis.userIds);
    let users = [];
    if (cacheResponse.isSuccess()) {
      let usersData = cacheResponse.data;
      for (let index in oThis.userIds) {
        let uuid = oThis.userIds[index];
        users.push(usersData[uuid]);
      }
    }
    responseData.users = users;

    return Promise.resolve(responseHelper.successWithData(responseData));
  }

  /**
   * Validate Specific params
   *
   * @returns {Promise<never>}
   * @private
   */
  async _validateParams() {
    const oThis = this;

    if (oThis.userIds && oThis.userIds.length > oThis._maxPageSize()) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 's_u_gl_1',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['ids_more_than_allowed_limit'],
          debug_options: {}
        })
      );
    }
  }

  /**
   * _fetchTokenUsersShards - fetch token user shards from cache
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
   * @return {Promise<void>}
   * @private
   */
  async _fetchUserIdsFromDdb() {
    const oThis = this,
      UserModelKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserModel');

    let userModelObj = new UserModelKlass({ shardNumber: oThis.userShard });

    let lastEvaluatedKey = oThis.paginationParams ? oThis.paginationParams.lastEvaluatedKey : '';

    return userModelObj.getUserIds(oThis.tokenId, oThis.limit, lastEvaluatedKey);
  }

  /**
   * _defaultPageSize
   * @private
   */
  _defaultPageSize() {
    return pagination.defaultUserListPageSize;
  }

  /**
   * _maxPageSize
   * @private
   */
  _maxPageSize() {
    return pagination.maxUserListPageSize;
  }

  /**
   * Fetch user details.
   *
   * @return {Promise<string>}
   */
  async _fetchUsersFromCache(userIds) {
    const oThis = this,
      TokenUserDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
      tokenUserDetailsCacheObj = new TokenUserDetailsCache({ tokenId: oThis.tokenId, userIds: userIds });

    return tokenUserDetailsCacheObj.fetch();
  }
}

InstanceComposer.registerAsShadowableClass(GetUsersList, coreConstants.icNameSpace, 'GetUsersList');

module.exports = {};
