'use strict';

const program = require('commander');

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  OriginOneTimeContractsSetup = require(rootPrefix + '/lib/setup/originChain/OneTimeContracts');

program.option('--originChainId <originChainId>', 'origin ChainId').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/setup/origin/contracts.js --originChainId 3');
  logger.log('');
  logger.log('');
});

if (!program.originChainId) {
  program.help();
  process.exit(1);
}

new OriginOneTimeContractsSetup(program.originChainId).perform().then(function(response) {
  process.exit(0);
});
