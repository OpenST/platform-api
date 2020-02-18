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
  .parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(
    '    node executables/redemptionProducts/create --redemptionProductName "Amazon" --redemptionProductDescription "This is some description."'
  );
  logger.log('');
  logger.log('');
});

if (!program.redemptionProductId) {
  if (!program.redemptionProductName || !program.redemptionProductDescription) {
    program.help();
    process.exit(1);
  }
}

if (program.redemptionProductId) {
  if (!program.redemptionProductName && !program.redemptionProductDescription) {
    program.help();
    process.exit(1);
  }
}

class CreateRedemptionProducts {
  constructor(params) {
    const oThis = this;
    oThis.redemptionProductId = params.redemptionProductId;
    oThis.name = params.name;
    oThis.description = params.description;
  }

  async perform() {
    const oThis = this;

    await new CreateRedemptionProductsLib({
      redemptionProductId: oThis.redemptionProductId,
      name: oThis.name,
      description: oThis.description
    }).perform();
  }
}

new CreateRedemptionProducts({
  redemptionProductId: program.redemptionProductId,
  name: program.redemptionProductName,
  description: program.redemptionProductDescription
})
  .perform()
  .then(function() {
    process.exit(0);
  })
  .catch(function(err) {
    logger.log(err);
    process.exit(1);
  });
