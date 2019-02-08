'use strict';
/**
 * This service fetches price points
 *
 * @module app/services/pricePoints/get
 */
const rootPrefix = '../../..',
  PricePointsCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/OstPricePoint'),
  ClientConfigGroupCache = require(rootPrefix + '/lib/cacheManagement/shared/ClientConfigGroup'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

/**
 * Class for Price Points Get API
 *
 * @class
 */
class PricePointsGet {
  /**
   * Constructor for Price Points Get API
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;
    oThis.clientId = params.client_id;
  }

  /**
   * perform
   * @return {Promise<>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('app/services/pricePoints/get::perform::catch');
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 's_pp_g_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * asyncPerform
   *
   * @return {Promise<any>}
   */
  async asyncPerform() {
    const oThis = this;

    let fetchChainIdRsp = await oThis.fetchChainId(oThis.clientId),
      auxChainId = fetchChainIdRsp.data;

    let pricePointsRsp = await oThis.fetchPricePointsData({ chainId: auxChainId }),
      pricePointsData = pricePointsRsp.data;

    return Promise.resolve(responseHelper.successWithData(pricePointsData));
  }

  /**
   * Fetches aux chain id of the given client id.
   *
   * @param {String} clientId: client id whose aux chain id is needed
   *
   * @returns {Promise<>} chainId
   */
  async fetchChainId(clientId) {
    const oThis = this;

    let clientConfigGroupCacheObj = new ClientConfigGroupCache({ clientId: clientId }),
      clientConfigGroupCacheRsp = await clientConfigGroupCacheObj.fetch();

    if (clientConfigGroupCacheRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_pp_g_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: { clientId: oThis.clientId }
        })
      );
    }

    logger.debug('Client config group data: ', clientConfigGroupCacheRsp.data);

    let auxChainId = clientConfigGroupCacheRsp.data[oThis.clientId].chainId;

    return Promise.resolve(responseHelper.successWithData(auxChainId));
  }

  /**
   * This function fetches price points for the given chain id
   *
   * @param {Object} params
   * @param {String} params.chainId: chainId for which price points are to be fetched.
   *
   *
   * @returns {Promise<*>}
   */
  async fetchPricePointsData(params) {
    const oThis = this;

    let chainId = params.chainId,
      pricePointsCacheObj = new PricePointsCache({ chainId: chainId }),
      pricePointsResponse = await pricePointsCacheObj.fetch();

    if (pricePointsResponse.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_pp_g_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: { chainId: chainId }
        })
      );
    }

    logger.debug('Price points data: ', pricePointsResponse.data);

    return Promise.resolve(responseHelper.successWithData(pricePointsResponse.data));
  }
}

module.exports = PricePointsGet;
