/**
 * Deploy price oracle contract on a particular aux chain id and for a particular base currency symbol.
 * Quote currency is assumed to be USD.
 *
 * @module executables/oneTimers/deployPriceOracle
 */

const program = require('commander');

const rootPrefix = '../..',
  DeployPriceOracle = require(rootPrefix + '/tools/chainSetup/aux/DeployPriceOracle'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  conversionRateConstants = require(rootPrefix + '/lib/globalConstant/conversionRates');

program
  .option('--auxChainId <auxChainId>', 'aux chainId')
  .option('--baseCurrencySymbol <baseCurrencySymbol>', 'Base currency symbol in upper case')
  .parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/oneTimers/deployPriceOracle.js --auxChainId 2000 --baseCurrencySymbol USDC');
  logger.log('');
  logger.log('');
});

if (!program.auxChainId) {
  program.help();
  process.exit(1);
}

if (!program.baseCurrencySymbol || program.baseCurrencySymbol.toUpperCase() != program.baseCurrencySymbol) {
  program.help();
  process.exit(1);
}

/**
 * Class to deploy price oracle contract.
 *
 * @class DeployPriceOracleExecutable
 */
class DeployPriceOracleExecutable {
  /**
   * Constructor to deploy price oracle contract.
   *
   * @param {string/number} auxChainId - aux chain id
   * @param {string} baseCurrencySymbol - base currency symbol in upper case
   *
   * @constructor
   */
  constructor(auxChainId, baseCurrencySymbol) {
    const oThis = this;

    oThis.auxChainId = auxChainId;
    oThis.baseCurrencySymbol = baseCurrencySymbol;
  }

  /**
   * Main performer method for the class.
   *
   * @returns {Promise<void>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(err) {
      logger.error(`${__filename}::perform`);

      return responseHelper.error({
        internal_error_identifier: 'e_ot_scs_duupoc_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: err
      });
    });
  }

  /**
   * Async performer.
   *
   * @return {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this;

    await new DeployPriceOracle({
      auxChainId: oThis.auxChainId,
      baseCurrencySymbol: oThis.baseCurrencySymbol,
      quoteCurrencySymbol: conversionRateConstants.USD,
      gasPrice: contractConstants.auxChainGasPrice
    }).perform();
  }
}

new DeployPriceOracleExecutable(program.auxChainId, program.baseCurrencySymbol)
  .perform()
  .then((r) => {
    logger.win('One-timer finished.', 'Return value:', r);
    process.exit(0);
  })
  .catch((err) => {
    logger.error('One-timer failed.', 'Error:', err);
    process.exit(1);
  });
