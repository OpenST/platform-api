const program = require('commander');

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  ConfigStrategyByChainId = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

program
  .option('--auxChainId <auxChainId>', 'Aux chain id to fetch config strategy.')
  .option('--images <images>', 'Map of images.')
  .option('--tokenRedemptionProductId <tokenRedemptionProductId>', 'Token redemption product id.')
  .option('--redemptionProductId <redemptionProductId>', 'Redemption product Id')
  .parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(
    '    node executables/redemptionProducts/createImages --auxChainId 2000 --images \'{"product":{"original":{"url":"https://dxwfxs8b4lg24.cloudfront.net/ost-platform/rskus/test-l-original.jpg","size":90821,"width":321,"height":182}},"list":{"original":{"url":"https://dxwfxs8b4lg24.cloudfront.net/ost-platform/rskus/test-p-original.jpg","size":193141,"width":320,"height":320}}}\' --redemptionProductId 1'
  );
  logger.log('');
  logger.log('');
});

if (!program.auxChainId || !program.images) {
  program.help();
  process.exit(1);
}

if (!program.tokenRedemptionProductId && !program.redemptionProductId) {
  program.help();
  process.exit(1);
}

require(rootPrefix + '/lib/redemption/products/CreateImages');

class CreateImages {
  constructor(params) {
    const oThis = this;
    oThis.auxChainId = params.auxChainId;
    oThis.redemptionProductId = params.redemptionProductId;
    oThis.tokenRedemptionProductId = params.tokenRedemptionProductId;
    oThis.image = JSON.parse(params.images);
  }

  async perform() {
    const oThis = this;

    await oThis.fetchConfigStrategy();

    await oThis._createTokenRedemptionProducts();
  }

  /**
   * Fetch config strategy.
   *
   * @sets oThis.ic
   *
   * @returns {Promise<void>}
   */
  async fetchConfigStrategy() {
    const oThis = this;

    const configStrategy = (await new ConfigStrategyByChainId(oThis.auxChainId).getComplete()).data;
    oThis.ic = new InstanceComposer(configStrategy);
  }

  /**
   * Create token redemption products.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _createTokenRedemptionProducts() {
    const oThis = this;

    const CreateImagesForRedemptionLib = oThis.ic.getShadowedClassFor(
      coreConstants.icNameSpace,
      'CreateImagesForRedemption'
    );

    await new CreateImagesForRedemptionLib({
      image: oThis.image,
      redemptionProductId: oThis.redemptionProductId,
      tokenRedemptionProductId: oThis.tokenRedemptionProductId
    }).perform();
  }
}

new CreateImages({
  auxChainId: program.tokenId,
  redemptionProductId: program.redemptionProductId,
  tokenRedemptionProductId: program.tokenRedemptionProductId,
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
