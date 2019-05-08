'use strict';
/**
 * This service fetches stake currency balance and eth balance of given address.
 *
 * @module app/services/token/GetBalance
 */
const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  GetEthBalance = require(rootPrefix + '/lib/getBalance/Eth'),
  GetErc20Balance = require(rootPrefix + '/lib/getBalance/Erc20'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  currencies = require(rootPrefix + '/lib/globalConstant/currencies'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  StakeCurrencyCacheBySymbol = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyBySymbol');

/**
 * Class to get currency balance of a given address.
 *
 * @class
 */
class GetBalance extends ServiceBase {
  /**
   * Constructor for GetBalance
   *
   * @param params
   * @param params.currencies {array} - currencies of which balance is needed
   * @param params.address {string} - address whose balance is needed
   *
   * @constructor
   */
  constructor(params) {
    super();
    const oThis = this;

    oThis.address = params.address;
    oThis.currencies = params.currencies;
  }

  /**
   * Async perform
   *
   * @returns {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._validateAndSanitize();

    await oThis._fetchErc20ContractAddresses();

    await oThis._fetchOriginChainId();

    return oThis._fetchBalances();
  }

  /**
   * Fetch origin chainId.
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchOriginChainId() {
    const oThis = this,
      csHelper = new ConfigStrategyHelper(0),
      csResponse = await csHelper.getForKind(configStrategyConstants.constants),
      configConstants = csResponse.data[configStrategyConstants.constants];

    oThis.originChainId = configConstants.originChainId;
  }

  /**
   * Validate And Sanitize
   *
   * @returns {Promise<void>}
   * @private
   */
  async _validateAndSanitize() {
    const oThis = this;

    oThis.erc20Currencies = [];

    for (let i = 0; i < oThis.currencies.length; i++) {
      oThis.currencies[i] = oThis.currencies[i].toUpperCase();
      if (oThis.currencies[i] === currencies.eth.toUpperCase()) {
        oThis.ethBalanceRequired = true;
      } else {
        oThis.erc20Currencies.push(oThis.currencies[i]);
      }
    }
    oThis.erc20Currencies = [...new Set(oThis.erc20Currencies)]; // Removes duplication.
  }

  /**
   * Fetch erc 20 contract address of stake currencies.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchErc20ContractAddresses() {
    const oThis = this;

    let stakeCurrencyResponse = await new StakeCurrencyCacheBySymbol({
      stakeCurrencySymbols: oThis.erc20Currencies
    }).fetch();

    if (stakeCurrencyResponse.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_t_gb_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { currencies: oThis.currencies }
        })
      );
    }
    oThis.stakeCurrenciesDetails = stakeCurrencyResponse.data;

    for (let stakeCurrency in oThis.stakeCurrenciesDetails) {
      if (
        !oThis.stakeCurrenciesDetails[stakeCurrency] ||
        !oThis.stakeCurrenciesDetails[stakeCurrency].contractAddress
      ) {
        return Promise.reject(
          responseHelper.paramValidationError({
            internal_error_identifier: 'a_s_t_gb_2',
            api_error_identifier: 'invalid_api_params',
            params_error_identifiers: ['invalid_currencies'],
            debug_options: { currencies: oThis.currencies }
          })
        );
      }
    }
  }

  /**
   * This function fetches all balances which are required.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchBalances() {
    const oThis = this;
    let promiseArray = [];

    if (oThis.ethBalanceRequired) {
      promiseArray.push(oThis._fetchEthBalance());
    }

    for (let stakeCurrency in oThis.stakeCurrenciesDetails) {
      promiseArray.push(
        oThis._fetchErc20Balance(oThis.stakeCurrenciesDetails[stakeCurrency].contractAddress, stakeCurrency)
      );
    }

    let balancesResponse = await Promise.all(promiseArray),
      finalResponse = {};

    for (let i = 0; i < balancesResponse.length; i++) {
      Object.assign(finalResponse, balancesResponse[i]);
    }

    return responseHelper.successWithData(finalResponse);
  }

  /**
   * Fetch eth balance of the given address.
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchEthBalance() {
    const oThis = this,
      getEthBalance = new GetEthBalance({
        originChainId: oThis.originChainId,
        addresses: [oThis.address]
      });

    let ethBalanceRsp = await getEthBalance.perform(),
      returnResponse = {};

    returnResponse[currencies.eth.toUpperCase()] = ethBalanceRsp[oThis.address];

    return returnResponse;
  }

  /**
   * Fetches erc20 balance
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchErc20Balance(contractAddress, currencySymbol) {
    const oThis = this,
      getErc20Balance = new GetErc20Balance({
        originChainId: oThis.originChainId,
        addresses: [oThis.address],
        contractAddress: contractAddress
      });

    let erc20BalanceRsp = await getErc20Balance.perform(),
      returnResponse = {};

    returnResponse[currencySymbol] = erc20BalanceRsp[oThis.address];

    return returnResponse;
  }
}

module.exports = GetBalance;
