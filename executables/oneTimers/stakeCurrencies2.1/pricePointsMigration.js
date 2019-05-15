/**
 * Module to update currency conversion rates table.
 *
 * @module executables/oneTimers/stakeCurrencies2.1/pricePointsMigration
 */

const rootPrefix = '../../..',
  StakeCurrencyModel = require(rootPrefix + '/app/models/mysql/StakeCurrency'),
  CurrencyConversionRateModel = require(rootPrefix + '/app/models/mysql/CurrencyConversionRate'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  conversionRateConstants = require(rootPrefix + '/lib/globalConstant/conversionRates');

/**
 * Class to update currency conversion rates table.
 *
 * @class PricePointsMigration
 */
class PricePointsMigration {
  /**
   * Main performer of class.
   *
   * @returns {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis._fetchStakeCurrencies();

    await oThis._updateCurrencyConversionRatesTable();
  }

  /**
   * Fetch stake currencies.
   *
   * @sets oThis.baseCurrencyIdToStakeCurrencyId
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchStakeCurrencies() {
    const oThis = this;

    const stakeCurrencies = await new StakeCurrencyModel().select('*').fire();
    const stakeCurrencySymbolToIdMap = {};

    oThis.baseCurrencyIdToStakeCurrencyId = {};

    for (let index = 0; index < stakeCurrencies.length; index++) {
      const stakeCurrencyRow = stakeCurrencies[index];
      stakeCurrencySymbolToIdMap[stakeCurrencyRow.symbol] = stakeCurrencyRow.id;
    }

    const baseCurrenciesEnum = conversionRateConstants.invertedBaseCurrencies;

    for (const symbol in baseCurrenciesEnum) {
      if (symbol === conversionRateConstants.USDC) {
        oThis.baseCurrencyIdToStakeCurrencyId[baseCurrenciesEnum[symbol]] = stakeCurrencySymbolToIdMap.PAX;
      } else {
        oThis.baseCurrencyIdToStakeCurrencyId[baseCurrenciesEnum[symbol]] = stakeCurrencySymbolToIdMap[symbol];
      }
    }
  }

  /**
   * Update currency conversion rates table.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _updateCurrencyConversionRatesTable() {
    const oThis = this;

    const promises = [];

    for (const baseCurrencyId in oThis.baseCurrencyIdToStakeCurrencyId) {
      promises.push(
        new CurrencyConversionRateModel()
          .update({
            stake_currency_id: oThis.baseCurrencyIdToStakeCurrencyId[baseCurrencyId]
          })
          .where({
            base_currency: baseCurrencyId
          })
          .fire()
      );
    }

    await Promise.all(promises);
  }
}

new PricePointsMigration()
  .perform()
  .then(() => {
    logger.win('One-timer finished.');
    process.exit(0);
  })
  .catch(() => {
    logger.error('One-timer failed.');
    process.exit(1);
  });
