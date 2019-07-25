/**
 * This service gets the details of the economy from economy model.
 *
 * @module app/services/token/Detail
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  ClientMileStoneHook = require(rootPrefix + '/lib/email/hookCreator/ClientMileStone'),
  StakeCurrencyById = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyById'),
  TokenCompanyUserCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenCompanyUserDetail'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  emailServiceConstants = require(rootPrefix + '/lib/globalConstant/emailServiceApiCallHooks'),
  pepoCampaignsConstants = require(rootPrefix + '/lib/globalConstant/pepoCampaigns'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

/**
 * Class for token details.
 *
 * @class TokenDetail
 */
class TokenDetail extends ServiceBase {
  /**
   * Constructor for token details.
   *
   * @param {object} params
   * @param {number} params.client_id
   *
   * @augments ServiceBase
   *
   * @constructor
   */
  constructor(params) {
    super();

    const oThis = this;

    oThis.clientId = params.client_id;

    oThis.originChainId = null;
    oThis.auxChainId = null;
    oThis.tokenAddresses = null;
    oThis.economyContractAddress = null;
    oThis.economyDetails = null;
    oThis.stakeCurrencySymbol = null;
    oThis.companyTokenHolderAddresses = [];
    oThis.companyUuids = [];
  }

  /**
   * Async perform.
   *
   * @return {Promise<any>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._fetchTokenDetails();

    await oThis._fetchStakeCurrencySymbol();

    await oThis._setChainIds();

    oThis.token.originChainId = oThis.originChainId;
    oThis.token.auxChainId = oThis.auxChainId;
    oThis.token.decimals = oThis.token.decimal;
    oThis.token.baseToken = oThis.stakeCurrencySymbol;

    await oThis._fetchTokenAddresses();

    return Promise.resolve(
      responseHelper.successWithData({
        [resultType.token]: {
          tokenDetails: oThis.token,
          tokenAddresses: oThis.tokenAddresses,
          economyDetails: oThis.economyDetails,
          companyTokenHolderAddresses: oThis.companyTokenHolderAddresses,
          companyUuids: oThis.companyUuids
        }
      })
    );
  }

  /**
   * This function fetches stake currency symbol.
   *
   * @sets oThis.stakeCurrencySymbol
   *
   * @returns {Promise<never>}
   * @private
   */
  async _fetchStakeCurrencySymbol() {
    const oThis = this;

    const stakeCurrencyId = oThis.token.stakeCurrencyId,
      stakeCurrencyDetails = await new StakeCurrencyById({ stakeCurrencyIds: [stakeCurrencyId] }).fetch();

    if (stakeCurrencyDetails.isFailure() || !stakeCurrencyDetails.data) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_t_d_5',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    oThis.stakeCurrencySymbol = stakeCurrencyDetails.data[stakeCurrencyId].symbol;
  }

  /**
   * Set chain ids.
   *
   * @sets oThis.originChainId, oThis.auxChainId
   *
   * @private
   */
  _setChainIds() {
    const oThis = this,
      configStrategy = oThis.ic().configStrategy;

    oThis.originChainId = configStrategy[configStrategyConstants.originGeth].chainId;
    oThis.auxChainId = configStrategy[configStrategyConstants.auxGeth].chainId;
  }

  /**
   * Fetch token addresses for token id.
   *
   * @sets oThis.tokenAddresses, oThis.economyContractAddress
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

    if (!oThis.economyContractAddress) {
      oThis.economyDetails = {};

      return Promise.resolve();
    }

    await oThis._getEconomyDetailsFromDdb();

    await oThis._setCompanyTokenHolderAddress();
  }

  /**
   * Get economy details for given token id.
   *
   * @sets oThis.economyDetails
   *
   * @returns {Promise<Promise<never>|undefined>}
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

    oThis.economyDetails = cacheResponse.data[oThis.economyContractAddress];

    if (!CommonValidators.validateObject(oThis.economyDetails)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_t_d_4',
          api_error_identifier: 'resource_not_found',
          debug_options: {}
        })
      );
    }
  }

  /**
   * Set company token holder address.
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
      oThis.companyUuids.push(uuid);
    }
  }
}

InstanceComposer.registerAsShadowableClass(TokenDetail, coreConstants.icNameSpace, 'TokenDetail');
