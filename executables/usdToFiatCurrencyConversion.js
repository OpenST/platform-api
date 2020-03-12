/**
 * This executable is used to verify balances.
 *
 * @module executables/usdToFiatCurrencyConversion
 */

const program = require('commander');

const rootPrefix = '..',
  CronBase = require(rootPrefix + '/executables/CronBase'),
  RedemptionCountryModel = require(rootPrefix + '/app/models/mysql/Country'),
  HttpRequest = require(rootPrefix + '/lib/providers/HttpRequest'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  errorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/usdToFiatCurrencyConversion.js --cronProcessId 35');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

/**
 * Class for balance verifier executable.
 *
 * @class usdToFiatCurrencyConversion
 */
class usdToFiatCurrencyConversion extends CronBase {
  /**
   * Constructor for balance verifier executable.
   *
   * @param {Object} params
   * @param {Number} params.cronProcessId: cron_processes table id
   *
   * @constructor
   */
  constructor(params) {
    super(params);
    const oThis = this;
    oThis.canExit = true;
  }

  /**
   * Start the executable.
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _start() {
    const requestObj = new HttpRequest({ resource: coreConstants.SA_S3_FIAT_PRICEPOINTS_PATH });

    const fiatConversionResp = await requestObj.get();
    let fiatConversionData = fiatConversionResp.data;

    if (fiatConversionData && fiatConversionData.responseData) {
      fiatConversionData = JSON.parse(fiatConversionData.responseData);

      // TODO - alpesh - check for success in the json.
      const fiatConversionRates = fiatConversionData.rates,
        alertCurrencies = [],
        countryIds = [],
        countryIsoCodes = [];

      console.log('-------fiatConversionRates--------', JSON.stringify(fiatConversionRates));

      if (fiatConversionRates) {
        const countries = await new RedemptionCountryModel()
          .select('*')
          .where('id>0')
          .fire();
        for (let ci = 0; ci < countries.length; ci++) {
          const country = countries[ci],
            conversions = JSON.parse(country.conversions),
            existingConversionRate = conversions['USD'],
            newConversionRate = fiatConversionRates[country.currency_iso_code],
            percentageDifference = ((existingConversionRate - newConversionRate) / existingConversionRate) * 100;

          countryIds.push(country.id);
          countryIsoCodes.push(country.country_iso_code);

          // we keep 5 percent tolerance. if value changes by more than 5 %, we alert.
          if (percentageDifference > -5 && percentageDifference < 5) {
            conversions['USD'] = newConversionRate;
            await new RedemptionCountryModel()
              .update({ conversions: JSON.stringify(conversions) })
              .where(['id=?', country.id])
              .fire();
          } else {
            alertCurrencies.push(country.currency_iso_code);
          }
        }

        RedemptionCountryModel.flushCache({ countryIds: countryIds, countryIsoCodes: countryIsoCodes });
      }
      if (alertCurrencies.length > 0) {
        const errorObject = responseHelper.error({
          internal_error_identifier: 'someCurrencyConversionFails:e_utfcc_1',
          api_error_identifier: 'someCurrencyConversionFails',
          debug_options: {
            alertEconomies: alertCurrencies
          }
        });
        await createErrorLogsEntry.perform(errorObject, errorLogsConstants.mediumSeverity);
      }
    }
  }

  /**
   * This function provides info whether the process has to exit.
   *
   * @returns {Boolean}
   *
   * @private
   */
  _pendingTasksDone() {
    const oThis = this;

    return oThis.canExit;
  }

  /**
   * Validate and sanitize.
   *
   * @private
   */
  async _validateAndSanitize() {
    return;
  }

  /**
   * Get cron kind.
   *
   * @returns {String}
   *
   * @private
   */
  get _cronKind() {
    return cronProcessesConstants.usdToFiatCurrencyConversion;
  }
}

const usdToFiatCurrencyObj = new usdToFiatCurrencyConversion({ cronProcessId: +program.cronProcessId });

usdToFiatCurrencyObj.perform().then(async function() {
  setTimeout(function() {
    process.emit('SIGINT');
  }, 10000);
});
