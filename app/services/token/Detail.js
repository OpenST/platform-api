'use strict';
/**
 * This service gets the details of the economy from economy model
 *
 * @module app/services/token/Detail
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  StakeCurrencyById = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyById'),
  TokenCompanyUserCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenCompanyUserDetail'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress');

require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

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
    oThis.tokenAddresses = null;
    oThis.economyContractAddress = null;
    oThis.economyDetails = null;
    oThis.stakeCurrencySymbol = null;
    oThis.companyTokenHolderAddresses = [];
  }

  /**
   * Async perform
   *
   * @return {Promise<any>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._fetchTokenDetails();

    await oThis._fetchStakeCurrencySymbol();

    await oThis._setChainIds();

    oThis.token['originChainId'] = oThis.originChainId;
    oThis.token['auxChainId'] = oThis.auxChainId;
    oThis.token['decimals'] = oThis.token.decimal;
    oThis.token['baseToken'] = oThis.stakeCurrencySymbol;

    await oThis._fetchTokenAddresses();

    return Promise.resolve(
      responseHelper.successWithData({
        [resultType.token]: {
          tokenDetails: oThis.token,
          tokenAddresses: oThis.tokenAddresses,
          economyDetails: oThis.economyDetails,
          companyTokenHolderAddresses: oThis.companyTokenHolderAddresses
        }
      })
    );
  }

  /**
   * This function fetches stake currency symbol.
   *
   * @returns {Promise<never>}
   * @private
   */
  async _fetchStakeCurrencySymbol() {
    const oThis = this;

    let stakeCurrencyId = oThis.token.stakeCurrencyId,
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
  }
}

InstanceComposer.registerAsShadowableClass(TokenDetail, coreConstants.icNameSpace, 'TokenDetail');
