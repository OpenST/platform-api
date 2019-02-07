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

/**
 * Class for getting block transactions service
 *
 * @class
 */
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
    oThis.limit = params.limit;

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

    if (!oThis.tokenId) {
      await oThis._fetchTokenDetails();
    }

    await oThis._validatePaginationParams();

    await oThis._fetchTokenUsersShards();

    let response = await oThis._fetchUsersFromDdb();

    if (response.isSuccess()) {
      return Promise.resolve(responseHelper.successWithData(response.data));
    } else {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 's_u_gl_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { error: response.error.toString() }
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
  async _fetchUsersFromDdb() {
    const oThis = this,
      UserModelKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserModel');

    let userModelObj = new UserModelKlass({ shardNumber: oThis.userShard });

    let lastEvaluatedKey = oThis.paginationParams ? oThis.paginationParams.lastEvaluatedKey : '';

    return userModelObj.getUsers(oThis.tokenId, oThis.limit, lastEvaluatedKey);
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
}

InstanceComposer.registerAsShadowableClass(GetUsersList, coreConstants.icNameSpace, 'GetUsersList');

module.exports = {};
