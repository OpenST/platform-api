/**
 * This service fetches price points
 *
 * @module app/services/chain/PricePoints
 */
const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  PricePointsCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/OstPricePoint'),
  TokenByTokenId = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenByTokenId'),
  StakeCurrencyById = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyById'),
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
   * @param {Number/String} [params.client_id]: client Id
   * @param {Number/String} [params.token_id]: token Id
   *
   * @constructor
   */
  constructor(params) {
    super();

    const oThis = this;

    oThis.chainId = params.chain_id;

    oThis.clientId = params.client_id;
    oThis.tokenId = params.token_id;
  }

  /**
   * AsyncPerform
   *
   * @return {Promise<any>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._validateParams();

    await oThis._fetchStakeCurrencySymbol();

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
   * This function fetches stake currency symbol.
   *
   * @returns {Promise<never>}
   * @private
   */
  async _fetchStakeCurrencySymbol() {
    const oThis = this;

    if (!oThis.clientId) {
      await oThis._fetchClientIdByTokenId();
    }

    await oThis._fetchTokenDetails();

    let stakeCurrencyId = oThis.token.stakeCurrencyId,
      stakeCurrencyDetails = await new StakeCurrencyById({ stakeCurrencyIds: [stakeCurrencyId] }).fetch();

    if (stakeCurrencyDetails.isFailure() || !stakeCurrencyDetails.data) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_c_pp_4',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    oThis.stakeCurrencySymbol = stakeCurrencyDetails.data[stakeCurrencyId].symbol;
  }

  /**
   * This function fetches client is using token id.
   *
   * @returns {Promise<never>}
   * @private
   */
  async _fetchClientIdByTokenId() {
    const oThis = this;

    let clientIdByTokenIdCacheObj = new TokenByTokenId({ tokenId: oThis.tokenId }),
      cacheResponse = await clientIdByTokenIdCacheObj.fetch();

    if (cacheResponse.isFailure() || !cacheResponse.data) {
      return Promise.reject(
        //This is not a param validation error because we are fetching token id and/or client id internally.
        responseHelper.error({
          internal_error_identifier: 'a_s_c_pp_5',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }
    oThis.clientId = cacheResponse.data.clientId;
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

    logger.debug('Price points data: ', pricePointData);

    let responseData = {};

    responseData[oThis.stakeCurrencySymbol] = pricePointData[oThis.stakeCurrencySymbol];
    responseData['decimals'] = contractConstants.requiredPriceOracleDecimals;

    return responseHelper.successWithData(responseData);
  }
}

module.exports = PricePointsGet;
