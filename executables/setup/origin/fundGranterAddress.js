'use strict';

const program = require('commander');

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  FundGranterAddress = require(rootPrefix + '/lib/setup/originChain/FundGranterAddress');

program
  .option('--stOwnerPrivateKey <stOwnerPrivateKey>', 'ST Owner Private Key')
  .option('--ethOwnerPrivateKey <ethOwnerPrivateKey>', 'ETH Owner Private Key')
  .parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(
    '    node executables/setup/origin/fundGranterAddress.js --stOwnerPrivateKey 0xabc --ethOwnerPrivateKey 0xabc'
  );
  logger.log('');
  logger.log('');
});

if (!program.stOwnerPrivateKey) {
  program.help();
  process.exit(1);
}

new FundGranterAddress(program.stOwnerPrivateKey).perform().then(function(response) {
  logger.log('response:', response);
  process.exit(0);
});
