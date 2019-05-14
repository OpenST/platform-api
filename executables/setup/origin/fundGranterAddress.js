/**
 * Module to fund granter address.
 *
 * @module executables/setup/origin/fundGranterAddress
 */

const program = require('commander');

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  FundGranterAddress = require(rootPrefix + '/lib/setup/originChain/FundGranterAddress');

program
  .option('--ethOwnerPrivateKey <ethOwnerPrivateKey>', 'ETH Owner Private Key')
  .option('--ethAmount <ethAmount>', 'ETH Amount')
  .option('--stakeCurrencySymbol <stakeCurrencySymbol>', 'stakeCurrency Symbol')
  .option('--stakeCurrencyOwnerPrivateKey <stakeCurrencyOwnerPrivateKey>', 'stakeCurrency Owner Private Key')
  .option('--stakeCurrencyAmount <stakeCurrencyAmount>', 'stakeCurrency Amount')
  .parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/setup/origin/fundGranterAddress.js --ethOwnerPrivateKey 0xabc --ethAmount 50');
  logger.log('');
  logger.log('');
});

if (
  (program.ethAmount && !program.ethOwnerPrivateKey) ||
  (program.stakeCurrencyAmount && (!program.stakeCurrencySymbol || !program.stakeCurrencyOwnerPrivateKey))
) {
  program.help();
  process.exit(1);
}

new FundGranterAddress(
  program.ethOwnerPrivateKey,
  program.ethAmount,
  program.stakeCurrencySymbol,
  program.stakeCurrencyOwnerPrivateKey,
  program.stakeCurrencyAmount
)
  .perform()
  .then(function(response) {
    logger.log('Response:', response);
    process.exit(0);
  });
