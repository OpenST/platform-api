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
    const oThis = this;
    const allCurrenciesS3Url = coreConstants.SA_S3_FIAT_PRICEPOINTS_URL + '/fiat-conversions.json';

    const requestObj = new HttpRequest({ resource: allCurrenciesS3Url });

    const fiatConversionResp = await requestObj.get();
    let fiatConversionData = fiatConversionResp.data;

    if (fiatConversionData && fiatConversionData.responseData) {
      fiatConversionData = JSON.parse(fiatConversionData.responseData);
      const fiatConversionRates = fiatConversionData.rates;

      console.log('-------fiatConversionRates--------', JSON.stringify(fiatConversionRates));

      if (fiatConversionRates) {
        const countries = await new RedemptionCountryModel()
          .select('*')
          .where('id>0')
          .fire();
        for (let ci = 0; ci < countries.length; ci++) {
          const country = countries[ci],
            conversions = JSON.parse(country.conversions),
            newConversionRate = fiatConversionRates[country.currency_iso_code];

          conversions['USD'] = newConversionRate;
          await new RedemptionCountryModel()
            .update({ conversions: JSON.stringify(conversions) })
            .where(['id=?', country.id])
            .fire();
        }
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
