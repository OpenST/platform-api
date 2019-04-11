/**
 * Module to create base currencies table.
 *
 * @module executables/oneTimers/stableCoinStaking/createBaseCurrenciesTable
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/app/models/ddb/shared/BaseCurrency');

/**
 * Class to create base currencies table.
 *
 * @class CreateBaseCurrenciesTable
 */
class CreateBaseCurrenciesTable {
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
        internal_error_identifier: 'e_ot_scs_cbct_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: err
      });
    });
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const strategyByChainHelper = new StrategyByChainHelper(0, 0),
      strategyFetchRsp = await strategyByChainHelper.getComplete(),
      configStrategy = strategyFetchRsp.data,
      ic = new InstanceComposer(configStrategy),
      BaseCurrencyModel = ic.getShadowedClassFor(coreConstants.icNameSpace, 'BaseCurrency');

    const baseCurrencyObject = new BaseCurrencyModel({});

    // Create Base Currencies table.
    await baseCurrencyObject.createTable();
  }
}

const createBaseCurrenciesTable = new CreateBaseCurrenciesTable();

createBaseCurrenciesTable
  .perform()
  .then(() => {
    console.log('One timer finished.');
    process.exit(0);
  })
  .catch((err) => {
    console.log(`Error: ${err}`);
    process.exit(1);
  });
