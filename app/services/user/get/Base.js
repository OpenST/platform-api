const rootPrefix = '../../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

// Following require(s) for registering into instance composer.
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

    await oThis._setUserIds();

    await oThis._fetchUsersFromCache();

    return oThis._formatApiResponse();
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
