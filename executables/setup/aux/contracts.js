'use strict';

const program = require('commander');

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  AuxContractsSetup = require(rootPrefix + '/lib/setup/auxChain/Contracts');

program
  .option('--originChainId <originChainId>', 'origin chain id')
  .option('--auxChainId <auxChainId>', 'aux chain id')
  .parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/setup/aux/contracts.js --originChainId 3 --auxChainId 2000');
  logger.log('');
  logger.log('');
});

if (!program.originChainId || !program.auxChainId) {
  program.help();
  process.exit(1);
}

new AuxContractsSetup(program.originChainId, program.auxChainId).perform().then(function(response) {
  logger.log('response:', response);
  process.exit(0);
});
