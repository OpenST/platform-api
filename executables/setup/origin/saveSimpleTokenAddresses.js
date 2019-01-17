'use strict';

const program = require('commander');

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  SaveSimpleTokenAddresses = require(rootPrefix + '/lib/setup/originChain/SaveSimpleTokenAddresses');

program
  .option('--admin <admin>', 'admin address')
  .option('--owner <owner>', 'owner address')
  .parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/setup/origin/saveSimpleTokenAddresses.js --owner 0xabc --admin 0xabc');
  logger.log('');
  logger.log('');
});

if (!program.admin || !program.owner) {
  program.help();
  process.exit(1);
}

new SaveSimpleTokenAddresses(program.owner, program.admin).perform().then(function(response) {
  logger.log('response:', response);
  process.exit(0);
});
