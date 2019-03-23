'use strict';

const program = require('commander');

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  OriginGethSetup = require(rootPrefix + '/lib/setup/originChain/Geth');

program.option('--originChainId <originChainId>', 'origin ChainId').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node tools/localSetup/origin/setupGeth.js --originChainId 3');
  logger.log('');
  logger.log('');
});

if (!program.originChainId) {
  program.help();
  process.exit(1);
}

new OriginGethSetup(program.originChainId).perform().then(function() {
  logger.log('Origin chain setup DONE!');
  process.exit(0);
});
