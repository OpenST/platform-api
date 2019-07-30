/**
 * Module to get dashboard details for an economy.
 *
 * @module app/services/token/getDashboardDetails
 */

const OSTBase = require('@ostdotcom/base'),
  BigNumber = require('bignumber.js'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  PricePointsCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/OstPricePoint'),
  TokenCompanyUserCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenCompanyUserDetail'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  GetUbtBalance = require(rootPrefix + '/lib/getBalance/Ubt'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  quoteCurrencyConstants = require(rootPrefix + '/lib/globalConstant/quoteCurrency');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

/**
 * Class to get dashboard details for an economy.
 *
 * @class GetTokenDashboardDetail
 */
class GetTokenDashboardDetail extends ServiceBase {
  /**
   * Constructor to get dashboard details for an economy.
   *
   * @param {object} params
   * @param {number} params.client_id
   * @param {number} params.token_id
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

    oThis.totalSupplyInWei = 0;
    oThis.totalVolumeInWei = 0;
    oThis.tokenHoldersBalanceBn = 0;
    oThis.totalTokenHolders = 0;
    oThis.totalTokenTransfers = 0;

    oThis.stakeCurrencyIsHowManyUSD = null;
    oThis.companyTokenHolderAddresses = [];
    oThis.auxChainId = null;
    oThis.economyContractAddress = null;
  }

  /**
   * Async perform.
   *
   * @return {Promise<any>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._fetchTokenDetails();

    await oThis._setAuxChainId();

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
   * Set aux chainId.
   *
   * @sets oThis.auxChainId
   *
   * @private
   */
  _setAuxChainId() {
    const oThis = this,
      configStrategy = oThis.ic().configStrategy;

    oThis.auxChainId = configStrategy[configStrategyConstants.auxGeth].chainId;
  }

  /**
   * Fetch token addresses for token id.
   *
   * @sets oThis.economyContractAddress
   *
   * @return {Promise<never>}
   * @private
   */
  async _fetchTokenAddresses() {
    const oThis = this;

    const cacheResponse = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    if (cacheResponse.isFailure()) {
      logger.error('Could not fetch token address details.');

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

    const tokenAddresses = cacheResponse.data;

    oThis.economyContractAddress = tokenAddresses[tokenAddressConstants.utilityBrandedTokenContract];
  }

  /**
   * Get economy details for given token id.
   *
   * @return {Promise<*|result>}
   * @private
   */
  async _getEconomyDetailsFromDdb() {
    const oThis = this;

    const blockScannerObj = await blockScannerProvider.getInstance([oThis.auxChainId]),
      EconomyCache = blockScannerObj.cache.Economy,
      economyCache = new EconomyCache({
        chainId: oThis.auxChainId,
        economyContractAddresses: [oThis.economyContractAddress]
      });

    const cacheResponse = await economyCache.fetch();

    if (cacheResponse.isFailure()) {
      logger.error('Could not fetched economy details from DDB.');

      return Promise.reject(cacheResponse);
    }

    const economyDetails = cacheResponse.data[oThis.economyContractAddress];

    // NOTE: Here totalVolume is converted into wei first, because basicHelper.toPrecision needs wei value.
    oThis.totalSupplyInWei = economyDetails.totalSupply;
    oThis.totalVolumeInWei = basicHelper.convertToLowerUnit(economyDetails.totalVolume, oThis.token.decimal);
    oThis.economyUsers = economyDetails.totalTokenHolders; // Total economy users
    oThis.totalTokenTransfers = economyDetails.totalTokenTransfers;
  }

  /**
   * Set company token holder addresses.
   *
   * @return {Promise<void>}
   * @private
   */
  async _setCompanyTokenHolderAddress() {
    const oThis = this;

    const tokenCompanyUserCacheRsp = await new TokenCompanyUserCache({ tokenId: oThis.tokenId }).fetch();

    if (
      tokenCompanyUserCacheRsp.isFailure() ||
      !tokenCompanyUserCacheRsp.data ||
      !tokenCompanyUserCacheRsp.data.userUuids
    ) {
      return Promise.resolve();
    }

    const TokenUSerDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
      tokenUserDetailsCacheObj = new TokenUSerDetailsCache({
        tokenId: oThis.tokenId,
        userIds: tokenCompanyUserCacheRsp.data.userUuids
      }),
      cacheFetchRsp = await tokenUserDetailsCacheObj.fetch();

    const usersData = cacheFetchRsp.data;

    for (const uuid in usersData) {
      const userData = usersData[uuid];
      oThis.companyTokenHolderAddresses.push(userData.tokenHolderAddress);
    }
  }

  /**
   * Fetch balance of all token holder addresses.
   *
   * @sets oThis.tokenHoldersBalanceBn
   *
   * @return {Promise<void>}
   * @private
   */
  async _getTokenHoldersBalance() {
    const oThis = this;

    const ubtBalances = await new GetUbtBalance({
      auxChainId: oThis.auxChainId,
      tokenId: oThis.tokenId,
      addresses: oThis.companyTokenHolderAddresses
    }).perform();

    for (const tha in ubtBalances) {
      const ubtBalance = ubtBalances[tha];

      oThis.tokenHoldersBalanceBn = new BigNumber(oThis.tokenHoldersBalanceBn).plus(new BigNumber(ubtBalance));
    }
  }

  /**
   * This function fetches price points for a particular chainId.
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchPricePointsData() {
    const oThis = this;

    const pricePointsCacheObj = new PricePointsCache({ chainId: oThis.auxChainId }),
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

    oThis.stakeCurrencyIsHowManyUSD = pricePointsResponse.data[oThis.token.stakeCurrencyId][quoteCurrencyConstants.USD];
  }

  /**
   * Prepare response.
   *
   * @returns {Promise}
   */
  prepareResponse() {
    const oThis = this;

    const totalSupply = basicHelper.toNormalPrecisionBT(oThis.totalSupplyInWei, oThis.token.decimal),
      totalSupplyDollar = oThis.getBtToDollar(oThis.totalSupplyInWei),
      totalVolume = basicHelper.toNormalPrecisionBT(oThis.totalVolumeInWei, oThis.token.decimal),
      totalVolumeDollar = oThis.getStakeCurrencyToDollar(oThis.totalVolumeInWei),
      circulatingSupplyInWei = new BigNumber(oThis.totalSupplyInWei).minus(oThis.tokenHoldersBalanceBn),
      circulatingSupply = basicHelper.toNormalPrecisionBT(circulatingSupplyInWei, oThis.token.decimal),
      circulatingSupplyDollar = oThis.getBtToDollar(circulatingSupplyInWei),
      economyUsers = oThis.economyUsers;

    return Promise.resolve(
      responseHelper.successWithData({
        totalSupply: totalSupply,
        totalSupplyDollar: totalSupplyDollar,
        totalVolume: totalVolume,
        totalVolumeDollar: totalVolumeDollar,
        totalTokenTransfers: oThis.totalTokenTransfers,
        circulatingSupply: circulatingSupply,
        circulatingSupplyDollar: circulatingSupplyDollar,
        economyUsers: economyUsers,
        tokenHoldersBalance: oThis.tokenHoldersBalanceBn
      })
    );
  }

  /**
   * Get BT to dollar value.
   *
   * @param {string} amountInWei
   *
   * @returns {string}
   */
  getBtToDollar(amountInWei) {
    const oThis = this;

    const oneStakeCurrencyIsHowManyBtFactor = oThis.token.conversionFactor;
    const totalStakeCurrencyInWei = new BigNumber(amountInWei).div(new BigNumber(oneStakeCurrencyIsHowManyBtFactor));

    return oThis.getStakeCurrencyToDollar(totalStakeCurrencyInWei);
  }

  /**
   * Get Stake currency to dollar.
   *
   * @param {string} amountInWei
   *
   * @returns {string}
   */
  getStakeCurrencyToDollar(amountInWei) {
    const oThis = this;

    const inUSD = new BigNumber(amountInWei).mul(new BigNumber(oThis.stakeCurrencyIsHowManyUSD));

    return basicHelper.toNormalPrecisionFiat(inUSD, oThis.token.decimal);
  }
}

InstanceComposer.registerAsShadowableClass(
  GetTokenDashboardDetail,
  coreConstants.icNameSpace,
  'GetTokenDashboardDetail'
);
