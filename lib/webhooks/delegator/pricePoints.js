/**
 * Module to create price points entity.
 *
 * @module lib/webhooks/delegator/pricePoints
 */

const rootPrefix = '../../..',
  GetPricePoints = require(rootPrefix + '/app/services/chain/PricePoints'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

/**
 * Class to create price points entity.
 *
 * @class PricePoints
 */
class PricePoints {
  /**
   * Main performer for class.
   *
   * @param {object} payload
   * @param {string} payload.webhookKind
   * @param {string/number} payload.chainId
   * @param {string} payload.clientId
   * @param {string} payload.baseCurrency
   *
   * @returns {Promise|*|undefined|Promise<T | never>}
   */
  perform(payload) {
    const oThis = this;

    return oThis._asyncPerform(payload).catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      }
      logger.error('lib/webhooks/delegator/pricePoints.js::perform::catch');
      logger.error(error);

      return responseHelper.error({
        internal_error_identifier: 'l_w_d_pp_1',
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
   * @param {string/number} payload.chainId
   * @param {string} payload.clientId
   * @param {string} payload.baseCurrency
   *
   * @returns {Promise<void>}
   * @private
   */
  async _asyncPerform(payload) {
    const pricePointsResp = await new GetPricePoints({
      chain_id: payload.chainId,
      client_id: payload.clientId
    });

    console.log('============', {
      entityResultType: resultType.pricePoint,
      rawEntity: pricePointsResp.data
    });

    return responseHelper.successWithData({
      entityResultType: resultType.pricePoint,
      rawEntity: pricePointsResp.data
    });
  }
}

module.exports = new PricePoints();
