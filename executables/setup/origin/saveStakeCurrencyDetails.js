/**
 * Module to save stake currency details in stake currencies and base currencies.
 *
 * @module executables/setup/origin/saveStakeCurrencyDetails
 */

const program = require('commander');

const rootPrefix = '../../..',
  SaveStakeCurrencyDetails = require(rootPrefix + '/lib/setup/originChain/SaveStakeCurrencyDetails'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

program
  .option('--contractSymbol <contractSymbol>', 'stake currency contract symbol')
  .option('--contractAddress <contractAddress>', 'stake currency contract address')
  .parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(
    '    node executables/setup/origin/saveStakeCurrencyDetails.js --contractSymbol OST --contractAddress 0xabc'
  );
  logger.log(
    '    node executables/setup/origin/saveStakeCurrencyDetails.js --contractSymbol USDC --contractAddress 0xabc'
  );
  logger.log('');
  logger.log('');
});

if (!program.contractAddress) {
  program.help();
  process.exit(1);
}

new SaveStakeCurrencyDetails(program.contractSymbol, program.contractAddress).perform().then(function(response) {
  logger.log(`Response: ${response}`);
  process.exit(0);
});
