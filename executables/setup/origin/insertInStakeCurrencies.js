/**
 * Module to insert stake currency details in stake currencies mysql table
 *
 * @module executables/setup/origin/insertInStakeCurrencies
 */

const program = require('commander');

const rootPrefix = '../../..',
  InsertInStakeCurrencies = require(rootPrefix + '/lib/setup/originChain/InsertInStakeCurrencies'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

program
  .option('--contractSymbol <contractSymbol>', 'stake currency contract symbol')
  .option('--contractName <contractName>', 'stake currency contract name')
  .parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(
    "    node executables/setup/origin/saveStakeCurrencyDetails.js --contractSymbol OST --contractName 'Simple Token'"
  );
  logger.log(
    "    node executables/setup/origin/saveStakeCurrencyDetails.js --contractSymbol USDC --contractName 'USD Coin'"
  );
  logger.log('');
  logger.log('');
});

if (!program.contractName || !program.contractSymbol) {
  program.help();
  process.exit(1);
}

new InsertInStakeCurrencies({
  contractName: program.contractName,
  contractSymbol: program.contractSymbol
})
  .perform()
  .then(function(response) {
    logger.log(`Response: ${response}`);
    process.exit(0);
  });
