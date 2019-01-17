'use strict';

const program = require('commander');

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  FundChainOwner = require(rootPrefix + '/lib/setup/originChain/FundChainOwner');

program.option('--funderPrivateKey <funderPrivateKey>', 'funder PrivateKey').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/setup/origin/fundChainOwner.js --funderPrivateKey 1000');
  logger.log('');
  logger.log('');
});

if (!program.funderPrivateKey) {
  program.help();
  process.exit(1);
}

new FundChainOwner(program.funderPrivateKey).perform().then(function(response) {
  logger.log('response:', response);
  process.exit(0);
});
