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
  .option('--images <images>', 'Map of images.')
  .option('--redemptionProductName <redemptionProductName>', 'Redemption product name.')
  .option('--redemptionProductDescription <redemptionProductDescription>', 'Redemption product description')
  .parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(
    '    node executables/redemptionProducts/createForToken --tokenId 1000 --redemptionProductId 1 --images \'{"detail":{"original":{"url":"https://dxwfxs8b4lg24.cloudfront.net/ost-platform/rskus/test-l-original.jpg","size":90821,"width":321,"height":182}},"cover":{"original":{"url":"https://dxwfxs8b4lg24.cloudfront.net/ost-platform/rskus/test-p-original.jpg","size":193141,"width":320,"height":320}}}\''
  );
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
    oThis.tokenId = params.tokenId || null;
    oThis.redemptionProductId = params.redemptionProductId || null;
    oThis.name = params.name || null;
    oThis.description = params.description || null;
    oThis.tokenRedemptionProductId = params.tokenRedemptionProductId || null;

    if (params.images) {
      oThis.images = JSON.parse(params.images);
    }
  }

  async perform() {
    const oThis = this;

    await oThis._createTokenRedemptionProducts();
  }

  /**
   * Create token redemption products.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _createTokenRedemptionProducts() {
    const oThis = this;

    await new CreateTokenRedemptionProductsLib({
      tokenId: oThis.tokenId,
      redemptionProductId: oThis.redemptionProductId,
      images: oThis.images,
      name: oThis.name,
      description: oThis.description,
      tokenRedemptionProductId: oThis.tokenRedemptionProductId
    }).perform();
  }
}

new CreateTokenRedemptionProducts({
  tokenId: program.tokenId,
  redemptionProductId: program.redemptionProductId,
  images: program.images,
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
