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
  .option('--redemptionProductDenomination <redemptionProductDenomination>', 'Redemption Product Denomination')
  .option('--expiryInDays <expiryInDays>', 'expiryInDays')
  .parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(
    '    node executables/redemptionProducts/createRedemptionProducts --redemptionProductName "Amazon" --redemptionProductDescription "This is some description." --redemptionProductDenomination \'{"USD":{"min":10,"max":50,"step":2}}\' --expiryInDays 1000'
  );
  logger.log('');
  logger.log('');
});

if (!program.redemptionProductId) {
  if (
    !program.redemptionProductName ||
    !program.redemptionProductDescription ||
    !program.redemptionProductDenomination
  ) {
    program.help();
    process.exit(1);
  }
}

if (program.redemptionProductId) {
  if (
    !program.redemptionProductName &&
    !program.redemptionProductDescription &&
    !program.redemptionProductDenomination &&
    !program.expiryInDays
  ) {
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
    oThis.denomination = JSON.parse(params.denomination);
    oThis.expiryInDays = params.expiryInDays;
  }

  async perform() {
    const oThis = this;

    await new CreateRedemptionProductsLib({
      redemptionProductId: oThis.redemptionProductId,
      name: oThis.name,
      description: oThis.description,
      denomination: oThis.denomination,
      expiryInDays: oThis.expiryInDays
    }).perform();
  }
}

new CreateRedemptionProducts({
  redemptionProductId: program.redemptionProductId,
  name: program.redemptionProductName,
  description: program.redemptionProductDescription,
  denomination: program.redemptionProductDenomination,
  expiryInDays: program.expiryInDays
})
  .perform()
  .then(function() {
    process.exit(0);
  })
  .catch(function(err) {
    logger.log(err);
    process.exit(1);
  });
