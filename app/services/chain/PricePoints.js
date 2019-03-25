/**
 * This service fetches price points
 *
 * @module app/services/chain/PricePoints
 */
const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  PricePointsCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/OstPricePoint'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig');

/**
 * Class for Price Points Get API.
 *
 * @class PricePointsGet
 */
class PricePointsGet extends ServiceBase {
  /**
   * Constructor for Price Points Get API.
   *
   * @param {Object} params
   * @param {Number/String} params.chain_id: chain Id
   *
   * @constructor
   */
  constructor(params) {
    super();

    const oThis = this;

    oThis.chainId = params.chain_id;
  }

  /**
   * AsyncPerform
   *
   * @return {Promise<any>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._validateParams();

    return oThis._fetchPricePointsData();
  }

  /**
   * Validate params
   *
   * @returns {Promise<*>}
   *
   * @private
   */
  async _validateParams() {
    const oThis = this,
      chainConfigMap = await chainConfigProvider.getFor([oThis.chainId]),
      chainConfig = chainConfigMap[oThis.chainId];

    // Check if chainId is originChainId or not.
    if (parseInt(oThis.chainId) === chainConfig.originGeth.chainId) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_c_pp_1',
          api_error_identifier: 'resource_not_found',
          params_error_identifiers: ['price_point_not_available_for_chain_id'],
          debug_options: {}
        })
      );
    }

    /*
    Check if it is auxChainId or not. We are not specifically checking the auxChainId value 
    because if chainConfig has the 'auxGeth' property, the chainId will obviously be the same.
     */
    if (!chainConfig.hasOwnProperty('auxGeth')) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_c_pp_2',
          api_error_identifier: 'resource_not_found',
          params_error_identifiers: ['invalid_chain_id'],
          debug_options: {}
        })
      );
    }

    return responseHelper.successWithData({});
  }

  /**
   * This function fetches price points for a particular chainId
   *
   * @returns {Promise<*>}
   *
   * @private
   */
  async _fetchPricePointsData() {
    const oThis = this;

    const pricePointsCacheObj = new PricePointsCache({ chainId: oThis.chainId }),
      pricePointsResponse = await pricePointsCacheObj.fetch();

    if (pricePointsResponse.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_c_pp_3',
          api_error_identifier: 'cache_issue',
          debug_options: { chainId: oThis.chainId }
        })
      );
    }

    const pricePointData = pricePointsResponse.data;
    pricePointData.decimals = contractConstants.requiredPriceOracleDecimals;

    logger.debug('Price points data: ', pricePointData);

    return responseHelper.successWithData(pricePointData);
  }
}

module.exports = PricePointsGet;
