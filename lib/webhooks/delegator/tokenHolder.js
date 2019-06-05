/**
 * Module to create tokenHolder entity.
 *
 * @module lib/webhooks/delegator/tokenHolder
 */

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/app/services/user/GetTokenHolder');

/**
 * Class to create tokenHolder entity.
 *
 * @class TokenHolder
 */
class TokenHolder {
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
      logger.error('lib/webhooks/delegator/tokenHolder.js::perform::catch');
      logger.error(error);

      return responseHelper.error({
        internal_error_identifier: 'l_w_d_th_1',
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
    const GetTokenHolder = ic.getShadowedClassFor(coreConstants.icNameSpace, 'GetTokenHolder'),
      getTokenHolder = new GetTokenHolder({
        client_id: payload.clientId,
        token_id: payload.tokenId,
        user_id: payload.userId
      });

    const tokenHolderResponse = await getTokenHolder.perform();

    return responseHelper.successWithData(tokenHolderResponse.data[resultType.tokenHolder]);
  }
}

module.exports = new TokenHolder();
