const program = require('commander');

const rootPrefix = '../..',
  CreateTokenRedemptionProductsLib = require(rootPrefix + '/lib/redemption/products/CreateForToken'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

program
  .option(
    '--tokenRedemptionProductId <tokenRedemptionProductId>',
    'Token redemption product Id only if you need to update token redemption products.'
  )
  .option('--tokenId <tokenId>', 'Token id to associate with redemption product id.')
  .option('--redemptionProductId <redemptionProductId>', 'Redemption product Id')
  .option('--redemptionProductName <redemptionProductName>', 'Redemption product name.')
  .option('--redemptionProductDescription <redemptionProductDescription>', 'Redemption product description')
  .parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/redemptionProducts/createForToken --tokenId 1000 --redemptionProductId 1');
  logger.log('');
  logger.log('');
});

if (!program.tokenRedemptionProductId) {
  if (!program.tokenId || !program.redemptionProductId) {
    program.help();
    process.exit(1);
  }
}

class CreateTokenRedemptionProducts {
  constructor(params) {
    const oThis = this;
    oThis.tokenId = params.tokenId;
    oThis.redemptionProductId = params.redemptionProductId;
    oThis.name = params.name;
    oThis.description = params.description;
    oThis.tokenRedemptionProductId = params.tokenRedemptionProductId;
  }

  async perform() {
    const oThis = this;

    await new CreateTokenRedemptionProductsLib({
      tokenId: oThis.tokenId,
      redemptionProductId: oThis.redemptionProductId,
      name: oThis.name,
      description: oThis.description,
      tokenRedemptionProductId: oThis.tokenRedemptionProductId
    }).perform();
  }
}

new CreateTokenRedemptionProducts({
  tokenId: program.tokenId,
  redemptionProductId: program.redemptionProductId,
  name: program.redemptionProductName,
  description: program.redemptionProductDescription,
  tokenRedemptionProductId: program.tokenRedemptionProductId
})
  .perform()
  .then(function() {
    process.exit(0);
  })
  .catch(function(err) {
    logger.log(err);
    process.exit(1);
  });
