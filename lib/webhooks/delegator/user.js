/**
 * Module to create user entity.
 *
 * @module lib/webhooks/delegator/user
 */

const rootPrefix = '../../..',
  UserFormatter = require(rootPrefix + '/lib/formatter/entity/User'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/app/services/user/get/ById');

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

    const GetUserById = ic.getShadowedClassFor(coreConstants.icNameSpace, 'GetUser'),
      getUserById = new GetUserById({
        client_id: payload.clientId,
        token_id: payload.tokenId,
        user_id: payload.userId
      });

    const userResponse = await getUserById.perform();

    return oThis.formatUserData(userResponse.data[resultType.user]);
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
