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
    '    node executables/redemptionProducts/createImages --auxChainId 2000 --images \'{"list":{"original":{"url":"https://s3.amazonaws.com/uassets.stagingpepo.com/pepo-staging1000/ua/rsku/images/1-b0fb183f452e288c42a6d2b18788551f-original.jpeg","size":123,"width":123,"height":123},"144w":{"url":"https://s3.amazonaws.com/uassets.stagingpepo.com/pepo-staging1000/ua/rsku/images/1-b0fb183f452e288c42a6d2b18788551f-144w.jpeg","size":123,"width":123,"height":123}},"product":{"original":{"url":"https://s3.amazonaws.com/uassets.stagingpepo.com/pepo-staging1000/ua/rsku/images/1-abcd-original.jpeg","size":123,"width":123,"height":123},"144w":{"url":"https://s3.amazonaws.com/uassets.stagingpepo.com/pepo-staging1000/ua/rsku/images/1-abcd-144w.jpeg","size":123,"width":123,"height":123}}}\'\n --redemptionProductId 1'
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
