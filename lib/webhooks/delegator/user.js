/**
 * Module to create user entity.
 *
 * @module lib/webhooks/delegator/User
 */

const rootPrefix = '../../..',
  UserFormatter = require(rootPrefix + '/lib/formatter/entity/User'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

/**
 * Class to create user entity.
 *
 * @class User
 */
class User {
  /**
   * Main performer for class.
   *
   * @param {object} payload
   * @param {string} payload.webhookKind
   * @param {string} payload.clientId
   * @param {string} payload.userId
   * @param {string} payload.tokenId
   * @param {object} ic
   *
   * @returns {Promise|*|undefined|Promise<T | never>}
   */
  perform(payload, ic) {
    const oThis = this;

    return oThis._asyncPerform(payload, ic).catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      }
      logger.error('lib/webhooks/delegator/user.js::perform::catch');
      logger.error(error);

      return responseHelper.error({
        internal_error_identifier: 'l_w_d_u_1',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: {}
      });
    });
  }

  /**
   * Async perform.
   *
   * @param {object} payload
   * @param {string} payload.webhookKind
   * @param {string} payload.clientId
   * @param {string} payload.userId
   * @param {string} payload.tokenId
   * @param {object} ic
   *
   * @returns {Promise<void>}
   * @private
   */
  async _asyncPerform(payload, ic) {
    const oThis = this;

    const userData = await oThis._fetchUsersFromCache(payload, ic);

    return oThis.formatUserData(userData);
  }

  /**
   * Fetch user details.
   *
   * @param {object} payload
   * @param {string} payload.webhookKind
   * @param {string} payload.clientId
   * @param {string} payload.userId
   * @param {string} payload.tokenId
   * @param {object} ic
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchUsersFromCache(payload, ic) {
    const tokenId = payload.tokenId;
    const userId = payload.userId;

    let userData = {};

    const TokenUserDetailsCache = ic.getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
      tokenUserDetailsCacheObj = new TokenUserDetailsCache({ tokenId: tokenId, userIds: [userId] });

    const cacheResponse = await tokenUserDetailsCacheObj.fetch();

    if (cacheResponse.isSuccess()) {
      const usersData = cacheResponse.data;

      if (!basicHelper.isEmptyObject(usersData[userId])) {
        userData = usersData[userId];
      }
    }

    return userData;
  }

  /**
   * Format user data using user entity formatter.
   *
   * @param {object} userData
   *
   * @returns {*|result}
   */
  formatUserData(userData) {
    const userFormattedRsp = new UserFormatter(userData).perform();

    return responseHelper.successWithData({
      result_type: resultType.user,
      [resultType.user]: userFormattedRsp.data
    });
  }
}

module.exports = new User();
