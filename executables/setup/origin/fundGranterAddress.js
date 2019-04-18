/**
 * Module to fund granter address.
 *
 * @module executables/setup/origin/fundGranterAddress
 */

const program = require('commander');

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  FundGranterAddress = require(rootPrefix + '/lib/setup/originChain/FundGranterAddress');

program
  .option('--stOwnerPrivateKey <stOwnerPrivateKey>', 'ST Owner Private Key')
  .option('--ethOwnerPrivateKey <ethOwnerPrivateKey>', 'ETH Owner Private Key')
  .option('--usdcOwnerPrivateKey <usdcOwnerPrivateKey>', 'USDC Owner Private Key')
  .option('--stAmount <stAmount>', 'ST Amount')
  .option('--ethAmount <ethAmount>', 'ETH Amount')
  .option('--usdcAmount <usdcAmount>', 'USDC Amount')
  .parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(
    '    node executables/setup/origin/fundGranterAddress.js --stOwnerPrivateKey 0xabc --ethOwnerPrivateKey 0xabc --stableCoinOwnerPrivateKey 0xabc --stAmount 200000 --ethAmount 50 --stableCoinAmount 200000'
  );
  logger.log('');
  logger.log('');
});

if (
  !program.stOwnerPrivateKey ||
  !program.ethOwnerPrivateKey ||
  !program.usdcOwnerPrivateKey ||
  !program.stAmount ||
  !program.ethAmount ||
  !program.usdcAmount
) {
  program.help();
  process.exit(1);
}

new FundGranterAddress(
  program.stOwnerPrivateKey,
  program.ethOwnerPrivateKey,
  program.usdcOwnerPrivateKey,
  program.stAmount,
  program.ethAmount,
  program.usdcAmount
)
  .perform()
  .then(function(response) {
    logger.log('Response:', response);
    process.exit(0);
  });
