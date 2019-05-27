/**
 * Module to activate stake currency
 *
 * @module executables/setup/origin/activateStakeCurrency
 */

const program = require('commander');

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ActivateStakeCurrency = require(rootPrefix + '/lib/setup/originChain/ActivateStakeCurrency');

program.option('--stakeCurrencySymbol <stakeCurrencySymbol>', 'Stake currency symbol to activate').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/setup/origin/activateStakeCurrency.js --stakeCurrencySymbol "OST"');
  logger.log('');
  logger.log('');
});

if (!program.stakeCurrencySymbol) {
  program.help();
  process.exit(1);
}

new ActivateStakeCurrency(program.stakeCurrencySymbol).perform().then(function(response) {
  logger.log('Response:', response);
  process.exit(0);
});
