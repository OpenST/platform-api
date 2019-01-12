'use strict';

const program = require('commander');

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  AuxGethSetup = require(rootPrefix + '/lib/setup/auxChain/Geth');

program
  .option('--originChainId <originChainId>', 'origin chain id')
  .option('--auxChainId <auxChainId>', 'aux chain id')
  .parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/setup/aux/gethAndAddresses.js --originChainId 1000 --auxChainId 2000');
  logger.log('');
  logger.log('');
});

if (!program.originChainId || !program.auxChainId) {
  program.help();
  process.exit(1);
}

new AuxGethSetup(program.originChainId, program.auxChainId).perform().then(function(response) {
  logger.log('response:', response);
  process.exit(0);
});
