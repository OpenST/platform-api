/**
 * Module to activate quote currency
 *
 * @module executables/setup/origin/activateQuoteCurrency
 */

const program = require('commander');

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ActivateQuoteCurrency = require(rootPrefix + '/lib/setup/originChain/ActivateQuoteCurrency');

program.option('--quoteCurrencySymbol <quoteCurrencySymbol>', 'Quote currency symbol to activate').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/setup/origin/activateQuoteCurrency.js --quoteCurrencySymbol "USD"');
  logger.log('');
  logger.log('');
});

if (!program.quoteCurrencySymbol) {
  program.help();
  process.exit(1);
}

new ActivateQuoteCurrency(program.quoteCurrencySymbol)
  .perform()
  .then(function(response) {
    process.exit(0);
  })
  .catch(function(err) {
    logger.log('Error:', err);
    process.exit(1);
  });
