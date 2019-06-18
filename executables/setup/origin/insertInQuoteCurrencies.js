/**
 * Module to insert quote currency details in quote currencies mysql table
 *
 * @module executables/setup/origin/insertInQuoteCurrencies
 */

const program = require('commander');

const rootPrefix = '../../..',
  InsertInQuoteCurrencies = require(rootPrefix + '/lib/setup/originChain/InsertInQuoteCurrencies'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

program
  .option('--symbol <symbol>', 'quote currency symbol')
  .option('--name <name>', 'quote currency name')
  .parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log("    node executables/setup/origin/insertInQuoteCurrencies.js --symbol 'USD' --name 'US Dollar'");
  logger.log('');
  logger.log('');
});

if (!program.symbol || !program.name) {
  program.help();
  process.exit(1);
}

new InsertInQuoteCurrencies({
  name: program.name,
  symbol: program.symbol
})
  .perform()
  .then(function(response) {
    logger.log(`Response: ${response}`);
    process.exit(0);
  });
