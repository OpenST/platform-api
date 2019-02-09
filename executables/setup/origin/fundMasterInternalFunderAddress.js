'use strict';

const program = require('commander');

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  FundMasterInternalFunder = require(rootPrefix + '/lib/setup/originChain/FundMasterInternalFunder');

program.option('--stOwnerPrivateKey <stOwnerPrivateKey>', 'ST Owner Private Key').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/setup/origin/fundMasterInternalFunderAddress.js --stOwnerPrivateKey 1000');
  logger.log('');
  logger.log('');
});

if (!program.stOwnerPrivateKey) {
  program.help();
  process.exit(1);
}

new FundMasterInternalFunder(program.stOwnerPrivateKey).perform().then(function(response) {
  logger.log('response:', response);
  process.exit(0);
});
