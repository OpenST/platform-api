'use strict';

const rootPrefix = '../..',
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

class InsertInDDBForOriginHighestBlock {
  /**
   *
   * @constructor
   */
  constructor() {
    const oThis = this;

    oThis.originChainId = null;
  }

  /**
   * perform
   *
   * @return {Promise|*|Promise<T>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error(`${__filename}::perform::catch`);
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'e_ot_ghbfoc_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * _asyncPerform
   *
   * @return {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    let providers = await oThis._getProvidersFromConfig(),
      provider = providers.data[0], //select one provider from provider endpoints array
      web3Instance = web3Provider.getInstance(provider).web3WsProvider;

    logger.info('origin chain id------', oThis.originChainId);

    logger.info('origin chain provider------', provider);

    // Get latest block on origin chain
    let highestOriginBlock = await web3Instance.eth.getBlock('latest');

    highestOriginBlock = highestOriginBlock['number'];

    logger.info('current highest block------', highestOriginBlock);

    // Get blockScanner object.
    const blockScannerObj = await blockScannerProvider.getInstance([oThis.originChainId]);

    // Initialize BlockParser.
    let BlockParser = blockScannerObj.block.Parser;

    // Create block parser object with highestOriginBlock as block to process
    let blockParser = new BlockParser(oThis.originChainId, {
      blockDelay: 0,
      blockToProcess: highestOriginBlock
    });

    // Run block parser to create entries in shard_by_block & block_details table
    let blockParserResponse = await blockParser.perform();

    if (!blockParserResponse.isSuccess()) {
      logger.error('Failed to parse highest block.');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_ot_ghbfoc_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            highestOriginBlock: highestOriginBlock
          }
        })
      );
    }

    logger.info('Created entries in DDB tables for current highest block:', highestOriginBlock);
    return Promise.resolve(responseHelper.successWithData('Done with success.'));
  }

  async _getProvidersFromConfig() {
    const oThis = this;

    let csHelper = new ConfigStrategyHelper(0),
      csResponse = await csHelper.getForKind(configStrategyConstants.originGeth),
      configForChain = csResponse.data[configStrategyConstants.originGeth],
      readWriteConfig = configForChain[configStrategyConstants.gethReadWrite],
      providers = readWriteConfig.wsProvider ? readWriteConfig.wsProviders : readWriteConfig.rpcProviders;

    oThis.originChainId = configForChain.chainId;

    return Promise.resolve(responseHelper.successWithData(providers));
  }
}

const insertInDDBForOriginHighestBlock = new InsertInDDBForOriginHighestBlock();

insertInDDBForOriginHighestBlock
  .perform()
  .then(function(r) {
    console.log(r);
    process.exit(0);
  })
  .catch(function(e) {
    console.log(e);
    process.exit(1);
  });
