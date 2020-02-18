const program = require('commander');

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  ConfigStrategyByChainId = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  TokenByTokenId = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenByTokenId'),
  ClientConfigGroupCache = require(rootPrefix + '/lib/cacheManagement/shared/ClientConfigGroup'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

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

require(rootPrefix + '/lib/redemption/products/CreateForToken');

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

    await oThis._fetchClientIdByTokenId();

    await oThis._fetchChainId();

    await oThis.fetchConfigStrategy();

    await oThis._createTokenRedemptionProducts();
  }

  /**
   * This function fetches client id using token id.
   *
   * @returns {Promise<never>}
   * @private
   */
  async _fetchClientIdByTokenId() {
    const oThis = this;

    const cacheResponse = await new TokenByTokenId({ tokenId: oThis.tokenId }).fetch();

    if (cacheResponse.isFailure() || !cacheResponse.data) {
      return Promise.reject(
        // This is not a param validation error because we are fetching token id and/or client id internally.
        responseHelper.error({
          internal_error_identifier: 'e_rp_cft_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    oThis.clientId = cacheResponse.data.clientId;
  }

  /**
   * Fetch client config strategy.
   *
   * @sets oThis.auxChainId
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchChainId() {
    const oThis = this;

    // Fetch client config group.
    const fetchCacheRsp = await new ClientConfigGroupCache({ clientId: oThis.clientId }).fetch();

    if (fetchCacheRsp.isFailure()) {
      return Promise.reject(fetchCacheRsp);
    }

    oThis.auxChainId = fetchCacheRsp.data[oThis.clientId].chainId;
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

    const CreateTokenRedemptionProductsLib = oThis.ic.getShadowedClassFor(
      coreConstants.icNameSpace,
      'CreateTokenRedemptionProducts'
    );

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
