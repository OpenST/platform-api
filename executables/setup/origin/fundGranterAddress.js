'use strict';

const program = require('commander');

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  FundGranterAddress = require(rootPrefix + '/lib/setup/originChain/FundGranterAddress');

program
  .option('--stOwnerPrivateKey <stOwnerPrivateKey>', 'ST Owner Private Key')
  .option('--ethOwnerPrivateKey <ethOwnerPrivateKey>', 'ETH Owner Private Key')
  .option('--stAmount <stAmount>', 'ST Amount')
  .option('--ethAmount <ethAmount>', 'ETH Amount')
  .parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(
    '    node executables/setup/origin/fundGranterAddress.js --stOwnerPrivateKey 0xabc --ethOwnerPrivateKey 0xabc --stAmount 200000 --ethAmount 50'
  );
  logger.log('');
  logger.log('');
});

if (!program.stOwnerPrivateKey) {
  program.help();
  process.exit(1);
}

if (!program.ethOwnerPrivateKey) {
  program.help();
  process.exit(1);
}

if (!program.stAmount) {
  program.help();
  process.exit(1);
}

if (!program.ethAmount) {
  program.help();
  process.exit(1);
}

new FundGranterAddress(program.stOwnerPrivateKey, program.ethOwnerPrivateKey, program.stAmount, program.ethAmount)
  .perform()
  .then(function(response) {
    logger.log('response:', response);
    process.exit(0);
  });
