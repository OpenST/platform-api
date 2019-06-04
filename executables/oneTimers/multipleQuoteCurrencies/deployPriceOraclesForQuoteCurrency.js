/**
 * One time file to deploy price oracles for quote currencies.
 *
 * @module executables/oneTimers/multipleQuoteCurrencies/deployPriceOraclesForQuoteCurrency
 */

const program = require('commander');

program
  .option('--symbol <symbol>', 'quote currency symbol')
  .option('--auxChainId <auxChainId>', 'aux chain id')
  .parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(
    "    node executables/oneTimers/multipleQuoteCurrencies/deployPriceOraclesForQuoteCurrency.js --symbol 'EUR' --auxChainId '2000'"
  );
  logger.log('');
  logger.log('');
});

if (!program.symbol || !program.auxChainId) {
  program.help();
  process.exit(1);
}

const rootPrefix = '../../..',
  StakeCurrencyModel = require(rootPrefix + '/app/models/mysql/StakeCurrency'),
  stakeCurrencyConstants = require(rootPrefix + '/lib/globalConstant/stakeCurrency'),
  DeployPriceOracle = require(rootPrefix + '/tools/chainSetup/aux/DeployPriceOracle'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

/**
 * Class to deploy price oracle contract for quote currency.
 *
 * @class DeployPriceOracleForQuoteCurrency
 */
class DeployPriceOracleForQuoteCurrency {
  /**
   * Constructor to deploy price oracle contract for EURO quote currency.
   *
   * @param {object} params
   * @param {string/number} params.auxChainId - auxChainId for which price oracle needs be deployed.
   * @param {string} params.quoteCurrencySymbol - quote currency symbol.
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.quoteCurrencySymbol = params.quoteCurrencySymbol;

    oThis.sleepInterval = 5000;
  }

  /**
   * Perform.
   *
   * @returns {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis.deployPriceOracles();
  }

  /**
   * Deploy price oracle contracts
   *
   * @returns {Promise<void>}
   */
  async deployPriceOracles() {
    const oThis = this;

    let stakeCurrenciesDetails = await new StakeCurrencyModel()
      .select('symbol')
      .where({ status: stakeCurrencyConstants.invertedStatuses[stakeCurrencyConstants.activeStatus] })
      .fire();

    for (let i = 0; i < stakeCurrenciesDetails.length; i++) {
      let baseCurrency = stakeCurrenciesDetails[i].symbol;

      logger.step(
        '* Deploying price oracle for base currency:',
        baseCurrency,
        ' quote currency:',
        oThis.quoteCurrencySymbol
      );

      await new DeployPriceOracle({
        auxChainId: oThis.auxChainId,
        baseCurrencySymbol: baseCurrency,
        quoteCurrencySymbol: oThis.quoteCurrencySymbol
      }).perform();

      await basicHelper.sleep(oThis.sleepInterval);
    }
  }
}

let params = {
    auxChainId: program.auxChainId,
    quoteCurrencySymbol: program.symbol
  },
  deployPriceOracleForQuoteCurrency = new DeployPriceOracleForQuoteCurrency(params);

deployPriceOracleForQuoteCurrency
  .perform()
  .then(function(resp) {
    process.exit(0);
  })
  .catch(function(err) {
    console.error(err);
    process.exit(1);
  });
