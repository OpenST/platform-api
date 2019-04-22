/**
 * Module to save USDC token contract details.
 *
 * @module executables/setup/origin/saveUsdcTokenAddresses
 */

const program = require('commander');

const rootPrefix = '../../..',
  SaveUsdcTokenAddresses = require(rootPrefix + '/lib/setup/originChain/SaveUsdcTokenAddresses'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

program.option('--owner <owner>', 'owner address').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/setup/origin/saveUsdcTokenAddresses.js --owner 0xabc');
  logger.log('');
  logger.log('');
});

if (!program.owner) {
  program.help();
  process.exit(1);
}

new SaveUsdcTokenAddresses(program.owner).perform().then(function(response) {
  logger.log(`Response: ${response}`);
  process.exit(0);
});
