'use strict';

const program = require('commander');

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  SimpleTokenSetup = require(rootPrefix + '/lib/setup/originChain/SimpleToken');

program.option('--originChainId <originChainId>', 'origin ChainId').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/setup/origin/simpleToken.js --originChainId 1000');
  logger.log('');
  logger.log('');
});

if (!program.originChainId) {
  program.help();
  process.exit(1);
}

new SimpleTokenSetup(program.originChainId).perform().then(function(response) {
  logger.log('response:', response);
  process.exit(0);
});
