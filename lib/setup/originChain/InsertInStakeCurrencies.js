/**
 * Insert in stake currency MYSQL Table
 *
 * @module lib/setup/originChain/InsertInStakeCurrencies
 */

const rootPrefix = '../../..',
  StakeCurrenciesModel = require(rootPrefix + '/app/models/mysql/StakeCurrency'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 *
 * @class InsertInStakeCurrencies
 */
class InsertInStakeCurrencies {
  /**
   * Constructor to save stake currency details in stake currencies and base currencies.
   *
   * @param {object} params
   * @param {string} params[contractName] : ERC20 contract name
   * @param {string} params[contractSymbol] : ERC20 contract symbol
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;
    oThis.contractName = params.contractName;
    oThis.contractSymbol = params.contractSymbol;
  }

  /**
   * Perform.
   *
   * @return {Promise<result>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      }
      logger.error('lib/setup/originChain/InsertInStakeCurrencies.js::perform::catch');
      logger.error(error);

      return responseHelper.error({
        internal_error_identifier: 'l_s_oc_iisc_1',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: { err: error.toString() }
      });
    });
  }

  /**
   * Async perform.
   *
   * @return {Promise<string>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._insertInStakeCurrencies();

    return 'Base currency contract details successfully inserted in stake currencies.';
  }

  /**
   * Create base currency entry in stake currencies table.
   *
   * @return {Promise<void>}
   * @private
   */
  async _insertInStakeCurrencies() {
    const oThis = this;

    return new StakeCurrenciesModel()
      .insert({
        name: oThis.contractName,
        symbol: oThis.contractSymbol,
        constants: JSON.stringify(oThis._contractConstants)
      })
      .fire();
  }

  /**
   *
   *
   *
   * @return {object}
   * @private
   */
  get _contractConstants() {
    const oThis = this;

    if (oThis.contractSymbol === 'OST') {
      return {
        baseCurrencyCode: 'OST',
        grantAmountInWei: '10000000000000000000000',
        prefixToFetchPriceFromCoinMarketCap: 'simple-token',
        companyTokenHolderSessionSpendingLimit: '10000000000000000000000'
      };
    } else if (oThis.contractSymbol === 'USDC') {
      return {
        baseCurrencyCode: 'USC',
        grantAmountInWei: '10000000000',
        prefixToFetchPriceFromCoinMarketCap: 'usd-coin',
        companyTokenHolderSessionSpendingLimit: '10000000000'
      };
    } else {
      throw `unsupported contractSymbol: ${oThis.contractSymbol}`;
    }
  }
}

module.exports = InsertInStakeCurrencies;
