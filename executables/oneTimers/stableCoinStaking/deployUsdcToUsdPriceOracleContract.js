/**
 * Module to deploy USDC to USD price oracle contract.
 *
 * @module executables/oneTimers/stableCoinStaking/deployUsdcToUsdPriceOracleContract
 */

const program = require('commander');

const rootPrefix = '../../..',
  DeployPriceOracle = require(rootPrefix + '/tools/chainSetup/aux/DeployPriceOracle'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  conversionRateConstants = require(rootPrefix + '/lib/globalConstant/conversionRates');

program.option('--auxChainId <auxChainId>', 'aux chainId').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(
    '    node executables/oneTimers/stableCoinStaking/deployUsdcToUsdPriceOracleContract.js --auxChainId 2000'
  );
  logger.log('');
  logger.log('');
});

if (!program.auxChainId) {
  program.help();
  process.exit(1);
}

/**
 * Class to deploy USDC to USD price oracle contract.
 *
 * @class DeployUsdcToUsdPriceOracleContract
 */
class DeployUsdcToUsdPriceOracleContract {
  /**
   * Constructor to deploy USDC to USD price oracle contract.
   *
   * @param {string/number} auxChainId
   *
   * @constructor
   */
  constructor(auxChainId) {
    const oThis = this;

    oThis.auxChainId = auxChainId;
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
      baseCurrency: conversionRateConstants.USDC,
      quoteCurrency: conversionRateConstants.USD,
      contractAddressKind: chainAddressConstants.auxUsdcToUsdPriceOracleContractKind
    }).perform();
  }
}

new DeployUsdcToUsdPriceOracleContract(program.auxChainId)
  .perform()
  .then(() => {
    logger.win('One-timer finished.');
    process.exit(0);
  })
  .catch(() => {
    logger.error('One-timer failed.');
    process.exit(1);
  });
