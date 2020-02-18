/**
 * This module helps in Validating user transaction redemption request
 */

const BigNumber = require('bignumber.js'),
  OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  TokenCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/Token'),
  quoteCurrencyConstants = require(rootPrefix + '/lib/globalConstant/quoteCurrency'),
  transactionTypeConstants = require(rootPrefix + '/lib/globalConstant/transactionTypes'),
  CurrencyConversionRateModel = require(rootPrefix + '/app/models/mysql/CurrencyConversionRate'),
  TokenCompanyUserCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenCompanyUserDetail');

require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');
require(rootPrefix + '/lib/cacheManagement/chain/TokenRedemptionProductIdsByTokenId');

/**
 * Class to validate user transaction redemption request.
 *
 * @class ValidateUserRedemptionTx
 */
class ValidateUserRedemptionTx {
  /**
   * Constructor to validate user transaction redemption request.
   *
   * @param params
   */
  constructor(params) {
    const oThis = this;
    oThis.clientId = params.clientId;
    oThis.tokenId = params.tokenId;
    oThis.redemptionDetails = params.redemptionDetails;
    oThis.transfersData = params.transfersData;
    oThis.metaProperty = params.metaProperty || {};

    oThis.token = null;
    oThis.transfersMap = null;
    oThis.companyTokenHolderAddresses = [];
  }

  /**
   * Main Performer
   *
   * @returns {Promise<*|result>}
   */
  async perform() {
    const oThis = this;

    // If redemption details map is empty, then no need to validate
    if (!CommonValidators.validateObject(oThis.redemptionDetails)) {
      return responseHelper.successWithData({});
    }

    await oThis._fetchTokenDetails();

    await oThis._validateTokenProduct();

    await oThis._validateTransfersData();

    await oThis._validateRedemptionAmounts();
  }

  /**
   * Fetch Token Details
   *
   * @returns {Promise<never>}
   * @private
   */
  async _fetchTokenDetails() {
    const oThis = this;

    const tokenCache = new TokenCache({
      clientId: oThis.clientId
    });

    const response = await tokenCache.fetch();
    if (!response.data) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_r_vurt_1',
          api_error_identifier: 'token_not_setup',
          debug_options: {}
        })
      );
    }

    oThis.token = response.data;
  }

  /**
   * Validate Token Product, is redeemable or not.
   *
   * @returns {Promise<never>}
   * @private
   */
  async _validateTokenProduct() {
    const oThis = this,
      productId = oThis.redemptionDetails['redeemable_sku_id'];

    // Check if redeemable product is present
    if (!CommonValidators.validateInteger(productId)) {
      return Promise.reject(oThis._errorResponse('l_r_vurt_2', 'invalid_redemption_product_id'));
    }

    const TokenProductsCache = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'TokenRedemptionProductIdsByTokenIdCache'),
      tokenProductDetailsCacheObj = new TokenProductsCache({
        tokenId: oThis.tokenId
      }),
      cacheFetchRsp = await tokenProductDetailsCacheObj.fetch(),
      redeemableProducts = cacheFetchRsp.data.productIds;

    if (redeemableProducts.length < 1 || redeemableProducts.indexOf(productId) <= -1) {
      return Promise.reject(oThis._errorResponse('l_r_vurt_3', 'invalid_redemption_product_id'));
    }
  }

  /**
   * Validate transfers data
   *
   * @returns {Promise<never>}
   * @private
   */
  async _validateTransfersData() {
    const oThis = this;

    // If meta property is not user_to_company
    if (oThis.metaProperty.type != transactionTypeConstants.userToCompanyTransactionType) {
      return Promise.reject(oThis._errorResponse('l_r_vurt_7', 'invalid_meta_properties'));
    }

    // If transfers data is not an array or there are more than 1 transfers happening in transaction
    if (!Array.isArray(oThis.transfersData) || oThis.transfersData.length > 1) {
      return Promise.reject(oThis._errorResponse('l_r_vurt_8', 'invalid_redemption_transfers'));
    }

    oThis.transfersMap = oThis.transfersData[0];

    await oThis._fetchCompanyTokenHolder();
    // If To address of transfers is not a company token holder address
    if (oThis.companyTokenHolderAddresses.indexOf(oThis.transfersMap.toAddress) <= -1) {
      return Promise.reject(oThis._errorResponse('l_r_vurt_10', 'invalid_redemption_transfers'));
    }
  }

  /**
   * Validate Redemption amounts and transfer amounts passed in transactions
   *
   * @returns {Promise<never>}
   * @private
   */
  async _validateRedemptionAmounts() {
    const oThis = this,
      amount = oThis.redemptionDetails['amount'],
      currency = oThis.redemptionDetails['currency'];

    // Check if redeemable amount is present
    if (!CommonValidators.validateNonZeroInteger(amount)) {
      return Promise.reject(oThis._errorResponse('l_r_vurt_4', 'invalid_redemption_amount'));
    }

    // If currency is empty or not in our list
    if (!currency || !quoteCurrencyConstants.invertedQuoteCurrencies[currency]) {
      return Promise.reject(oThis._errorResponse('l_r_vurt_5', 'invalid_redemption_currency'));
    }

    // Compare number of BTs to be transferred for given redemption amount
    await oThis._validateRedemptionAmountAndBT(quoteCurrencyConstants.invertedQuoteCurrencies[currency], amount);
  }

  /**
   * Get number of BT from Fiat amount
   *
   * @param fiatAmount
   * @param stakeCurrencyIsHowManyFiat
   * @returns {BigNumber}
   * @private
   */
  _getNumberOfBTFromFiat(fiatAmount, stakeCurrencyIsHowManyFiat) {
    const oThis = this;

    // This will give number of stake currency tokens from fiat amount
    const inStakeCurrency = new BigNumber(fiatAmount).div(new BigNumber(stakeCurrencyIsHowManyFiat));

    // From number of stake currency tokens fetch BT amount
    const oneStakeCurrencyIsHowManyBtFactor = oThis.token.conversionFactor;
    const numberOfBts = new BigNumber(inStakeCurrency).mul(new BigNumber(oneStakeCurrencyIsHowManyBtFactor));

    return numberOfBts.mul(new BigNumber(10).toPower(oThis.token.decimal)).floor();
  }

  /**
   * Validate Redemption Amount and BT
   *
   * @param currencyId
   * @param redemptionAmount
   * @returns {Promise<never>}
   * @private
   */
  async _validateRedemptionAmountAndBT(currencyId, redemptionAmount) {
    const oThis = this;

    // Fetch Stake currency conversion rates
    // Looking for last 2 records, since conversion rate has to be considered for last one hour.
    const conversionRates = await new CurrencyConversionRateModel({})
      .select('*')
      .where({
        quote_currency_id: currencyId,
        stake_currency_id: oThis.token.stakeCurrencyId
      })
      .order_by('timestamp DESC')
      .limit(2)
      .fire();

    let isValidAmount = false,
      transferBTAmount = new BigNumber(oThis.transfersMap.value);
    for (let i = 0; i < conversionRates.length; i++) {
      const calculatedBTInWei = oThis._getNumberOfBTFromFiat(redemptionAmount, conversionRates[i].conversion_rate);
      if (calculatedBTInWei.equals(transferBTAmount)) {
        isValidAmount = true;
        break;
      }
    }

    if (!isValidAmount) {
      return Promise.reject(oThis._errorResponse('l_r_vurt_6', 'invalid_redemption_amount'));
    }
  }

  /**
   * Fetch Company token holder address.
   *
   * @returns {Promise<unknown>}
   * @private
   */
  async _fetchCompanyTokenHolder() {
    const oThis = this;

    const tokenCompanyUserCacheRsp = await new TokenCompanyUserCache({ tokenId: oThis.tokenId }).fetch();

    if (
      tokenCompanyUserCacheRsp.isFailure() ||
      !tokenCompanyUserCacheRsp.data ||
      !tokenCompanyUserCacheRsp.data.userUuids
    ) {
      return Promise.reject(oThis._errorResponse('l_r_vurt_9', 'invalid_redemption_transfers'));
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
   * Error response to send
   *
   * @param internalErrorId
   * @param errorId
   * @returns {*|result}
   * @private
   */
  _errorResponse(internalErrorId, errorId) {
    return responseHelper.paramValidationError({
      internal_error_identifier: internalErrorId,
      api_error_identifier: 'invalid_api_params',
      params_error_identifiers: [errorId],
      debug_options: {}
    });
  }
}

InstanceComposer.registerAsShadowableClass(
  ValidateUserRedemptionTx,
  coreConstants.icNameSpace,
  'ValidateUserRedemptionTx'
);

module.exports = {};