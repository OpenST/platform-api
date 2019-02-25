'use strict';
/**
 * Base service class for getting user
 *
 * @module app/services/user/get/Base
 */
const rootPrefix = '../../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  basicHelper = require(rootPrefix + '/helpers/basic');

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/models/ddb/sharded/User');
require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

class GetUserBase extends ServiceBase {
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

    oThis.userDetails = [];
    oThis.userShard = null;
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

    await oThis._setUserIds();

    await oThis._fetchUsersFromCache();

    return oThis._formatApiResponse();
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
   * Fetch user details.
   *
   * @return {Promise<string>}
   */
  async _fetchUsersFromCache() {
    const oThis = this,
      TokenUserDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
      tokenUserDetailsCacheObj = new TokenUserDetailsCache({ tokenId: oThis.tokenId, userIds: oThis.userIds });

    let cacheResponse = await tokenUserDetailsCacheObj.fetch();

    if (cacheResponse.isSuccess()) {
      let usersData = cacheResponse.data;
      for (let index in oThis.userIds) {
        let uuid = oThis.userIds[index];
        if (!basicHelper.isEmptyObject(usersData[uuid])) {
          oThis.userDetails.push(usersData[uuid]);
        }
      }
    }
  }

  /**
   * Validate and samitnize params
   *
   * @return {Promise<void>}
   * @private
   */
  async _validateAndSanitizeParams() {
    throw 'sub-class to implement';
  }

  /**
   * Set user ids
   *
   * @private
   */
  async _setUserIds() {
    throw 'sub-class to implement';
  }

  /**
   * @private
   */
  async _formatApiResponse() {
    throw 'sub-class to implement';
  }
}

module.exports = GetUserBase;
