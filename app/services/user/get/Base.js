/**
 * Module for getting user.
 *
 * @module app/services/user/get/Base
 */

const rootPrefix = '../../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  basicHelper = require(rootPrefix + '/helpers/basic');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/app/models/ddb/sharded/User');
require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

/**
 * Class for getting user.
 *
 * @class GetUserBase
 */
class GetUserBase extends ServiceBase {
  /**
   * Constructor for getting user.
   *
   * @param {object} params
   * @param {number} params.client_id: client Id
   * @param {number} [params.token_id]: token Id
   * @param {array} [params.ids]: filter by user uuids.
   * @param {array} [params.limit]: limit
   * @param {string} [params.pagination_identifier]: pagination identifier to fetch page
   *
   * @augments ServiceBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.tokenId = params.token_id;

    oThis.userDetails = [];
    oThis.userShard = null;
  }

  /**
   * Async perform: Perform Get user lists.
   *
   * @return {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._validateAndSanitizeParams();

    await oThis._validateTokenStatus();

    await oThis._fetchTokenUsersShards();

    await oThis._setUserIds();

    await oThis._fetchUsersFromCache();

    return oThis._formatApiResponse();
  }

  /**
   * Fetch token user shards from cache.
   *
   * @sets oThis.userShard
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchTokenUsersShards() {
    const oThis = this;

    const TokenShardNumbersCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenShardNumbersCache');
    const tokenShardNumbersCache = new TokenShardNumbersCache({
      tokenId: oThis.tokenId
    });

    const response = await tokenShardNumbersCache.fetch();

    if (!response || !response.data.user) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_u_g_b_1',
          api_error_identifier: 'token_not_setup',
          debug_options: {}
        })
      );
    }

    oThis.userShard = response.data.user;
  }

  /**
   * Fetch user details.
   *
   * @sets oThis.userDetails
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchUsersFromCache() {
    const oThis = this,
      TokenUserDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
      tokenUserDetailsCacheObj = new TokenUserDetailsCache({ tokenId: oThis.tokenId, userIds: oThis.userIds });

    const cacheResponse = await tokenUserDetailsCacheObj.fetch();

    if (cacheResponse.isSuccess()) {
      const usersData = cacheResponse.data;
      for (const index in oThis.userIds) {
        const uuid = oThis.userIds[index];
        if (!basicHelper.isEmptyObject(usersData[uuid])) {
          oThis.userDetails.push(usersData[uuid]);
        }
      }
    }
  }

  /**
   * Validate and sanitize params.
   *
   * @return {Promise<void>}
   * @private
   */
  async _validateAndSanitizeParams() {
    throw new Error('Sub-class to implement.');
  }

  /**
   * Set user ids.
   *
   * @return {Promise<void>}
   * @private
   */
  async _setUserIds() {
    throw new Error('Sub-class to implement.');
  }

  /**
   * Format API response.
   *
   * @return {Promise<void>}
   * @private
   */
  async _formatApiResponse() {
    throw new Error('Sub-class to implement.');
  }
}

module.exports = GetUserBase;
