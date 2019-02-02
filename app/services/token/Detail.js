'use strict';
/**
 * This service gets the details of the economy from economy model
 *
 * @module app/services/token/Detail
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  TokenDetailCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Token'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress');

/**
 * Class for token details.
 *
 * @class
 */
class TokenDetail extends ServiceBase {
  /**
   *
   * @param {Object} params
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientId = params.client_id;

    oThis.originChainId = null;
    oThis.auxChainId = null;
    oThis.tokenDetails = null;
    oThis.tokenId = null;
    oThis.tokenAddresses = null;
    oThis.economyContractAddress = null;
    oThis.economyDetails = null;
  }

  /**
   * Async perform
   *
   * @return {Promise<any>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._setChainIds();

    await oThis._fetchTokenDetails();

    await oThis._fetchTokenAddresses();

    await oThis._getEconomyDetailsFromDdb();

    return Promise.resolve(
      responseHelper.successWithData({
        tokenDetails: oThis.tokenDetails,
        tokenAddresses: oThis.tokenAddresses,
        economyDetails: oThis.economyDetails
      })
    );
  }

  /**
   *
   * Set chain ids
   *
   * @private
   */
  _setChainIds() {
    const oThis = this,
      configStrategy = oThis.ic().configStrategy;

    oThis.originChainId = configStrategy[configStrategyConstants.originGeth]['chainId'];
    oThis.auxChainId = configStrategy[configStrategyConstants.auxGeth]['chainId'];
  }

  /**
   * Fetch token details for given client id
   *
   * @return {Promise<never>}
   * @private
   */
  async _fetchTokenDetails() {
    const oThis = this;

    let cacheResponse = await new TokenDetailCache({ clientId: oThis.clientId }).fetch();

    if (cacheResponse.isFailure()) {
      logger.error('Could not fetched token details.');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_t_d_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            clientId: oThis.clientId
          }
        })
      );
    }

    oThis.tokenDetails = cacheResponse.data;

    oThis.tokenDetails['originChainId'] = oThis.originChainId;
    oThis.tokenDetails['auxChainId'] = oThis.auxChainId;

    oThis.tokenId = oThis.tokenDetails['id'];
  }

  /**
   * Fetch Token Addresses for token id
   *
   * @return {Promise<never>}
   * @private
   */
  async _fetchTokenAddresses() {
    const oThis = this;

    let cacheResponse = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    if (cacheResponse.isFailure()) {
      logger.error('Could not fetched token address details.');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_t_d_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            clientId: oThis.clientId,
            tokenId: oThis.tokenId
          }
        })
      );
    }

    oThis.tokenAddresses = cacheResponse.data;

    oThis.economyContractAddress = oThis.tokenAddresses[tokenAddressConstants.utilityBrandedTokenContract];
  }

  /**
   * Get economy details for given token id.
   *
   * @return {Promise<*|result>}
   */
  async _getEconomyDetailsFromDdb() {
    const oThis = this;

    let blockScannerObj = await blockScannerProvider.getInstance([oThis.auxChainId]),
      EconomyCache = blockScannerObj.cache.Economy,
      economyCache = new EconomyCache({
        chainId: oThis.auxChainId,
        economyContractAddresses: [oThis.economyContractAddress]
      });

    let cacheResponse = await economyCache.fetch();

    if (cacheResponse.isFailure()) {
      logger.error('Could not fetched economy details from DDB.');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_t_d_4',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            clientId: oThis.clientId,
            economyContractAddresses: [oThis.economyContractAddress]
          }
        })
      );
    }

    oThis.economyDetails = cacheResponse.data[oThis.economyContractAddress];
  }
}

InstanceComposer.registerAsShadowableClass(TokenDetail, coreConstants.icNameSpace, 'TokenDetail');
