/**
 * Module to save simple token contract details.
 *
 * @module executables/setup/origin/saveSimpleTokenAddresses
 */

const program = require('commander');

const rootPrefix = '../../..',
  SaveSimpleTokenAddresses = require(rootPrefix + '/lib/setup/originChain/SaveSimpleTokenAddresses'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

program
  .option('--admin <admin>', 'admin address')
  .option('--owner <owner>', 'owner address')
  .option('--stContractAddress <stContractAddress>', 'simple token contract address')
  .parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(
    '    node executables/setup/origin/saveSimpleTokenAddresses.js --owner 0xabc --admin 0xabc --stContractAddress 0xabc'
  );
  logger.log('');
  logger.log('');
});

if (!program.admin || !program.owner || !program.stContractAddress) {
  program.help();
  process.exit(1);
}

new SaveSimpleTokenAddresses(program.owner, program.admin, program.stContractAddress)
  .perform()
  .then(function(response) {
    logger.log(`Response: ${response}`);
    process.exit(0);
  });
