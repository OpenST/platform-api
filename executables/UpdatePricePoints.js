'use strict';
/**
 * This script will update price oracle price points using ost-price-oracle npm package.
 * This fetches OST Current price in given currency from coin market cap and sets it in price oracle.
 *
 * Usage: node executables/UpdatePricePoints.js chainId
 *
 * Command Line Parameters Description:
 * groupId: Chain id to fetch the price oracles from strategy
 *
 * Example: node executables/UpdatePricePoints.js chainId
 *
 * @module executables/UpdatePricePoints
 */

const rootPrefix = '..';

//Always Include Module overrides First
require(rootPrefix + '/module_overrides/index');

const conversionRateConstants = require(rootPrefix + '/lib/globalConstant/conversionRates'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

const InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/app/services/conversionRates/UpdatePricePoints');

const args = process.argv,
  chainId = args[2];

let configStrategy = {};

// Usage demo.
const usageDemo = function() {
  logger.log('usage:', 'node executables/update_price_oracle_price_points.js chainId');
  logger.log('* config Strategy FilePath is the path to the file which is storing the config strategy info.');
};

// Validate and sanitize the command line arguments.
const validateAndSanitize = function() {
  if (!chainId) {
    logger.error('Chain id is not passed in the input.');
    usageDemo();
    process.exit(1);
  }
};

// Validate and sanitize the input params.
validateAndSanitize();

class UpdatePriceOraclePricePoints {
  async perform() {
    const oThis = this,
      strategyByGroupHelperObj = new ConfigStrategyHelper(chainId),
      configStrategyResp = await strategyByGroupHelperObj.getComplete();

    configStrategy = configStrategyResp.data;

    let instanceComposer = new InstanceComposer(configStrategy);

    if (Object.keys(configStrategy.auxConstants.priceOracles).length === 0) {
      throw 'Price oracle contracts not defined';
    }

    for (let baseCurrency in configStrategy.auxConstants.priceOracles) {
      logger.log('baseCurrency--------', configStrategy.auxConstants.priceOracles[baseCurrency]);

      if (baseCurrency == conversionRateConstants.OST) {
        let quoteCurrencies = configStrategy.auxConstants.priceOracles[baseCurrency];

        for (let quoteCurrency in quoteCurrencies) {
          if (quoteCurrency == conversionRateConstants.USD) {
            logger.step("Updating quote currency '" + quoteCurrency + "' in base currency '" + baseCurrency + "'");

            let ostPriceUpdater = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'UpdatePricePoints');
            await new ostPriceUpdater({ currency: conversionRateConstants.USD }).perform();

            process.exit(0);
          } else {
            throw "Unhandled quote currency '" + quoteCurrency + "' in base currency '" + baseCurrency + "'";
          }
        }
      } else {
        throw "Unhandled base currency '" + baseCurrency + "'";
      }
    }
  }
}

// perform action
const UpdatePriceOraclePricePointObj = new UpdatePriceOraclePricePoints();
UpdatePriceOraclePricePointObj.perform().then(function(r) {
  process.exit(0);
});
