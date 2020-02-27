const program = require('commander');

const rootPrefix = '../..',
  CreateRedemptionProductsLib = require(rootPrefix + '/lib/redemption/products/Create'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

program
  .option(
    '--redemptionProductId <redemptionProductId>',
    'Redemption product Id only if you need to update redemption products.'
  )
  .option('--redemptionProductName <redemptionProductName>', 'Redemption product name.')
  .option('--redemptionProductDescription <redemptionProductDescription>', 'Redemption product description')
  .option('--images <images>', 'Map of images.')
  .parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(
    '    node executables/redemptionProducts/create --redemptionProductName "Amazon" --images \'{"detail":{"original":{"url":"https://dxwfxs8b4lg24.cloudfront.net/ost-platform/rskus/test-l-original.jpg","size":90821,"width":321,"height":182}},"cover":{"original":{"url":"https://dxwfxs8b4lg24.cloudfront.net/ost-platform/rskus/test-p-original.jpg","size":193141,"width":320,"height":320}}}\''
  );
  logger.log('');
  logger.log('');
});

if (!program.redemptionProductId) {
  if (!program.redemptionProductName) {
    program.help();
    process.exit(1);
  }
}

if (program.redemptionProductId) {
  if (!program.redemptionProductName && !program.redemptionProductDescription && !program.images) {
    program.help();
    process.exit(1);
  }
}

class CreateRedemptionProducts {
  constructor(params) {
    const oThis = this;
    oThis.redemptionProductId = params.redemptionProductId || null;
    oThis.name = params.name || null;
    oThis.description = params.description || null;

    if (params.images) {
      oThis.images = JSON.parse(params.images);
    }
  }

  async perform() {
    const oThis = this;

    await new CreateRedemptionProductsLib({
      redemptionProductId: oThis.redemptionProductId,
      name: oThis.name,
      description: oThis.description,
      images: oThis.images
    }).perform();
  }
}

new CreateRedemptionProducts({
  redemptionProductId: program.redemptionProductId,
  name: program.redemptionProductName,
  description: program.redemptionProductDescription,
  images: program.images
})
  .perform()
  .then(function() {
    process.exit(0);
  })
  .catch(function(err) {
    logger.log(err);
    process.exit(1);
  });
