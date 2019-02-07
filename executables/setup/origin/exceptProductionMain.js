'use strict';

const program = require('commander');

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ExceptProductionMain = require(rootPrefix + '/lib/setup/originChain/ExceptProductionMain');

program.option('--originChainId <originChainId>', 'origin ChainId').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/setup/origin/exceptNonProductionMain.js --originChainId 1000');
  logger.log('');
  logger.log('');
});

if (!program.originChainId) {
  program.help();
  process.exit(1);
}

new ExceptProductionMain(program.originChainId).perform().then(function(response) {
  logger.log('Setup Simple Token response:', response);
  process.exit(0);
});
