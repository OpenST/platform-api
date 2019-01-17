'use strict';

const program = require('commander');

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  OnlyForDevEnv = require(rootPrefix + '/lib/setup/originChain/OnlyForDevEnv');

program.option('--stOwnerPrivateKey <stOwnerPrivateKey>', 'stOwner PrivateKey').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/setup/origin/onlyForDevEnv.js --stOwnerPrivateKey 0xabc');
  logger.log('');
  logger.log('');
});

if (!program.stOwnerPrivateKey) {
  program.help();
  process.exit(1);
}

new OnlyForDevEnv(program.stOwnerPrivateKey).perform().then(function(response) {
  logger.log('response:', response);
  process.exit(0);
});
