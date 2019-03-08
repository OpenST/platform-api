'use strict';
/**
 * This service gets the details of the economy from economy model
 *
 * @module app/services/token/Detail
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer,
  BigNumber = require('bignumber.js');

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  PricePointsCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/OstPricePoint'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  getUbtBalance = require(rootPrefix + '/lib/getBalance/Ubt'),
  TokenCompanyUserCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenCompanyUserDetail'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress');

require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

/**
 * Class for token details.
 *
 * @class
 */
class GetTokenDashboardDetail extends ServiceBase {
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
    oThis.tokenId = params.token_id;

    oThis.totalSupply = 0;
    oThis.totalVolume = 0;
    oThis.tokenHoldersBalance = 0;

    oThis.companyTokenHolderAddresses = [];
    oThis.auxChainId = null;
    oThis.economyContractAddress = null;
  }

  /**
   * Async perform
   *
   * @return {Promise<any>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._fetchTokenDetails();

    await oThis._setChainIds();

    await oThis._fetchTokenAddresses();

    if (oThis.economyContractAddress) {
      await oThis._getEconomyDetailsFromDdb();

      await oThis._setCompanyTokenHolderAddress();
    }

    await oThis._fetchPricePointsData();

    await oThis._getTokenHoldersBalance();

    return oThis.prepareResponse();
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

    oThis.auxChainId = configStrategy[configStrategyConstants.auxGeth]['chainId'];
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
          internal_error_identifier: 'a_s_t_gdd_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            clientId: oThis.clientId,
            tokenId: oThis.tokenId
          }
        })
      );
    }

    let tokenAddresses = cacheResponse.data;
    oThis.economyContractAddress = tokenAddresses[tokenAddressConstants.utilityBrandedTokenContract];
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
      return Promise.reject(cacheResponse);
    }

    let economyDetails = cacheResponse.data[oThis.economyContractAddress];
    console.log('economyDetails----------e--------', economyDetails);

    oThis.totalSupply = economyDetails.totalSupply;
    oThis.totalVolume = economyDetails.totalVolume;
  }

  /**
   *
   * @return {Promise<void>}
   * @private
   */
  async _setCompanyTokenHolderAddress() {
    const oThis = this;

    let tokenCompanyUserCacheRsp = await new TokenCompanyUserCache({ tokenId: oThis.tokenId }).fetch();

    if (
      tokenCompanyUserCacheRsp.isFailure() ||
      !tokenCompanyUserCacheRsp.data ||
      !tokenCompanyUserCacheRsp.data['userUuids']
    ) {
      return Promise.resolve();
    }

    let TokenUSerDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
      tokenUserDetailsCacheObj = new TokenUSerDetailsCache({
        tokenId: oThis.tokenId,
        userIds: tokenCompanyUserCacheRsp.data['userUuids']
      }),
      cacheFetchRsp = await tokenUserDetailsCacheObj.fetch();

    let usersData = cacheFetchRsp.data;

    for (let uuid in usersData) {
      let userData = usersData[uuid];
      oThis.companyTokenHolderAddresses.push(userData.tokenHolderAddress);
    }

    console.log('--oThis.companyTokenHolderAddresses--------------', oThis.companyTokenHolderAddresses);
  }

  async _getTokenHoldersBalance() {
    const oThis = this;

    let ubtbalances = await new getUbtBalance({
      auxChainId: oThis.auxChainId,
      tokenId: oThis.tokenId,
      addresses: oThis.companyTokenHolderAddresses
    }).perform();

    for (let i = 0; i < ubtbalances.length; i++) {
      let ubtbalance = ubtbalances[i];
      new BigNumber(oThis.tokenHoldersBalance).plus(ubtbalance);
    }
    console.log('--oThis.tokenHoldersBalance--------', oThis.tokenHoldersBalance);
  }

  /**
   * This function fetches price points for a particular chainId
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchPricePointsData() {
    const oThis = this;

    let pricePointsCacheObj = new PricePointsCache({ chainId: oThis.auxChainId }),
      pricePointsResponse = await pricePointsCacheObj.fetch();

    if (pricePointsResponse.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_t_gdd_2',
          api_error_identifier: 'cache_issue',
          debug_options: { chainId: oThis.auxChainId }
        })
      );
    }

    logger.info('Price points data: ', pricePointsResponse.data);

    oThis.ostIsHowManyUSD = pricePointsResponse.data.OST.USD;
  }

  /**
   * Prepare response.
   *
   * @returns {Promise}
   */
  prepareResponse() {
    const oThis = this;

    let totalSupply = basicHelper.convertWeiToNormal(oThis.totalSupply).toString(10),
      totalSupplyDollar = basicHelper.convertWeiToNormal(oThis.getBtToDollar(oThis.totalSupply)).toString(10),
      totalVolume = basicHelper.convertWeiToNormal(oThis.totalVolume).toString(10),
      totalVolumeDollar = basicHelper.convertWeiToNormal(oThis.getBtToDollar(oThis.totalVolume)).toString(10),
      circulatingSupplyInWei = new BigNumber(oThis.totalSupply).minus(oThis.tokenHoldersBalance),
      circulatingSupply = basicHelper.convertWeiToNormal(circulatingSupplyInWei).toString(10),
      circulatingSupplyDollar = basicHelper
        .convertWeiToNormal(oThis.getBtToDollar(circulatingSupplyInWei))
        .toString(10);

    return Promise.resolve(
      responseHelper.successWithData({
        totalSupply: totalSupply,
        totalSupplyDollar: totalSupplyDollar,
        totalVolume: totalVolume,
        totalVolumeDollar: totalVolumeDollar,
        circulatingSupply: circulatingSupply,
        circulatingSupplyDollar: circulatingSupplyDollar
      })
    );
  }

  /**
   *
   *
   * @param amountinWei
   * @returns {string}
   */
  getBtToDollar(amountinWei) {
    const oThis = this;
    let oneOstIsHowManyBtFactor = oThis.token.conversionFactor;

    let totalOstInWei = new BigNumber(amountinWei).div(oneOstIsHowManyBtFactor);
    let inUSD = new BigNumber(totalOstInWei).mul(oThis.ostIsHowManyUSD);

    return inUSD;
  }
}

InstanceComposer.registerAsShadowableClass(
  GetTokenDashboardDetail,
  coreConstants.icNameSpace,
  'GetTokenDashboardDetail'
);
