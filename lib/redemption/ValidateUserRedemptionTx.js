const uuidv4 = require('uuid/v4'),
  BigNumber = require('bignumber.js'),
  OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  AddressesEncryptor = require(rootPrefix + '/lib/encryptors/AddressesEncryptor'),
  CurrencyConversionRateModel = require(rootPrefix + '/app/models/mysql/CurrencyConversionRate'),
  TokenCompanyUserCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenCompanyUserDetail'),
  TokenRedemptionProductsCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/TokenRedemptionProduct'),
  CountryByCountryIsoCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/RedemptionCountryByCountryIso'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  quoteCurrencyConstants = require(rootPrefix + '/lib/globalConstant/quoteCurrency'),
  transactionTypeConstants = require(rootPrefix + '/lib/globalConstant/transactionTypes'),
  tokenRedemptionProductConstants = require(rootPrefix + '/lib/globalConstant/tokenRedemptionProducts');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');
require(rootPrefix + '/lib/cacheManagement/chain/UserSaltEncryptorKey');

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
    oThis.token = params.token;
    oThis.redemptionDetails = params.redemptionDetails;
    oThis.transfersData = params.transfersData;
    oThis.metaProperty = params.metaProperty || {};

    oThis.transfersMap = null;
    oThis.encryptedEmail = null;
    oThis.companyTokenHolderAddresses = [];
  }

  /**
   * Main performer for class.
   *
   * @returns {Promise<*|result>}
   */
  async perform() {
    const oThis = this;

    await oThis._validateTokenProduct();

    await oThis._validateTransfersData();

    await oThis._validateRedemptionAmounts();

    await oThis._encryptUserEmailAddress();

    return oThis._prepareRedemptionResponse();
  }

  /**
   * Validate token product, is redeemable or not.
   *
   * @returns {Promise<never>}
   * @private
   */
  async _validateTokenProduct() {
    const oThis = this;

    const productId = oThis.redemptionDetails.redeemable_sku_id;

    // Check if redeemable product is present
    if (!CommonValidators.validateInteger(productId)) {
      return Promise.reject(oThis._errorResponse('l_r_vurt_2', 'invalid_redemption_product_id'));
    }

    const cacheFetchRsp = await new TokenRedemptionProductsCache({ tokenRedemptionProductIds: [productId] }).fetch(),
      redemptionProduct = cacheFetchRsp.data[productId];

    // If product is not active or doesn't exist for a token.
    if (
      !CommonValidators.validateObject(redemptionProduct) ||
      redemptionProduct.tokenId != oThis.tokenId ||
      redemptionProduct.status !== tokenRedemptionProductConstants.activeStatus
    ) {
      return Promise.reject(oThis._errorResponse('l_r_vurt_3', 'invalid_redemption_product_id'));
    }
  }

  /**
   * Validate transfers data.
   *
   * @sets oThis.transfersMap
   *
   * @returns {Promise<never>}
   * @private
   */
  async _validateTransfersData() {
    const oThis = this;

    // If meta property is not user_to_company.
    if (oThis.metaProperty.type !== transactionTypeConstants.userToCompanyTransactionType) {
      return Promise.reject(oThis._errorResponse('l_r_vurt_8', 'invalid_meta_properties'));
    }

    // If transfers data is not an array or there are more than 1 transfers happening in transaction
    if (!Array.isArray(oThis.transfersData) || oThis.transfersData.length > 1) {
      return Promise.reject(oThis._errorResponse('l_r_vurt_9', 'invalid_redemption_transfers'));
    }

    oThis.transfersMap = oThis.transfersData[0];

    await oThis._fetchCompanyTokenHolder();
    // If To address of transfers is not a company token holder address
    if (oThis.companyTokenHolderAddresses.indexOf(oThis.transfersMap.toAddress) <= -1) {
      return Promise.reject(oThis._errorResponse('l_r_vurt_10', 'invalid_redemption_transfers'));
    }
  }

  /**
   * Validate redemption amounts and transfer amounts passed in transactions.
   *
   * @sets oThis.redemptionDetails
   *
   * @returns {Promise<never>}
   * @private
   */
  async _validateRedemptionAmounts() {
    const oThis = this;

    const amount = oThis.redemptionDetails.amount_in_fiat,
      country = oThis.redemptionDetails.country_iso_code;

    // Check if redeemable amount is present.
    if (!CommonValidators.validateNonZeroNumber(amount)) {
      return Promise.reject(oThis._errorResponse('l_r_vurt_4', 'invalid_redemption_amount'));
    }

    // If country is empty or not in our list
    if (!country) {
      return Promise.reject(oThis._errorResponse('l_r_vurt_5', 'invalid_redemption_country'));
    }
    const countryResp = await new CountryByCountryIsoCache({ countryIsoCodes: [country] }).fetch();
    if (countryResp.isFailure() || !CommonValidators.validateNonEmptyObject(countryResp.data[country])) {
      return Promise.reject(oThis._errorResponse('l_r_vurt_6', 'invalid_redemption_country'));
    }

    // Compare number of BTs to be transferred for given redemption amount
    const countryData = countryResp.data[country];
    oThis.redemptionDetails.countryId = countryData.id;
    oThis.redemptionDetails.currency = countryData.currencyIsoCode;
    await oThis._validateRedemptionAmountAndBT(amount, countryData.conversions[quoteCurrencyConstants.USD]);
  }

  /**
   * Validate redemption amounts and BT.
   *
   * @param {number/string} redemptionAmount
   * @param {string} currencyToUSDConversion
   *
   * @returns {Promise<never>}
   * @private
   */
  async _validateRedemptionAmountAndBT(redemptionAmount, currencyToUSDConversion) {
    const oThis = this;

    // Fetch Stake currency conversion rates
    // Looking for last 2 records, since conversion rate has to be considered for last one hour.
    // If there would be many redemption requests, then we would convert this query to cache
    const conversionRates = await new CurrencyConversionRateModel({})
      .select('*')
      .where({
        quote_currency_id: quoteCurrencyConstants.invertedQuoteCurrencies[quoteCurrencyConstants.USD],
        stake_currency_id: oThis.token.stakeCurrencyId
      })
      .order_by('timestamp DESC')
      .limit(2)
      .fire();

    const transferBTAmount = new BigNumber(oThis.transfersMap.value);
    let isValidAmount = false;
    for (let index = 0; index < conversionRates.length; index++) {
      const calculatedBTInWei = basicHelper.getNumberOfBTFromFiat(
        redemptionAmount,
        currencyToUSDConversion,
        conversionRates[index].conversion_rate,
        oThis.token.conversionFactor,
        oThis.token.decimal
      );
      if (calculatedBTInWei.equals(transferBTAmount)) {
        isValidAmount = true;
        break;
      }
    }

    if (!isValidAmount) {
      return Promise.reject(oThis._errorResponse('l_r_vurt_7', 'invalid_redemption_amount'));
    }
  }

  /**
   * Fetch company token holder address.
   *
   * @sets oThis.companyTokenHolderAddresses
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
      return Promise.reject(oThis._errorResponse('l_r_vurt_11', 'invalid_redemption_transfers'));
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
   * Prepare redemption response, if all parameters are valid and redemption is accepted.
   *
   * @returns {*|result}
   * @private
   */
  _prepareRedemptionResponse() {
    const oThis = this;

    const redemptionMeta = {
      redemptionId: uuidv4(),
      redemptionProductId: oThis.redemptionDetails.redeemable_sku_id,
      amount: oThis.redemptionDetails.amount_in_fiat,
      country: oThis.redemptionDetails.country_iso_code,
      currency: oThis.redemptionDetails.currency,
      countryId: oThis.redemptionDetails.countryId
    };

    return responseHelper.successWithData({
      redemptionDetails: redemptionMeta,
      redemptionEmail: oThis.encryptedEmail
    });
  }

  /**
   * Encrypt user email address, which is provided for redemption.
   *
   * @sets oThis.encryptedEmail
   *
   * @returns {Promise<void>}
   * @private
   */
  async _encryptUserEmailAddress() {
    const oThis = this,
      emailAddress = oThis.redemptionDetails.email;

    if (!emailAddress || !CommonValidators.isValidEmail(emailAddress)) {
      return Promise.reject(oThis._errorResponse('l_r_vurt_12', 'invalid_redemption_email'));
    }

    const UserSaltEncryptorKeyCache = oThis
        .ic()
        .getShadowedClassFor(coreConstants.icNameSpace, 'UserSaltEncryptorKeyCache'),
      encryptionSaltResp = await new UserSaltEncryptorKeyCache({ tokenId: oThis.tokenId }).fetchDecryptedData();

    const encryptionSalt = encryptionSaltResp.data.encryption_salt_d;

    oThis.encryptedEmail = await new AddressesEncryptor({ encryptionSaltD: encryptionSalt }).encrypt(emailAddress);
  }

  /**
   * Error response to send.
   *
   * @param {string} internalErrorId
   * @param {string} errorId
   *
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
