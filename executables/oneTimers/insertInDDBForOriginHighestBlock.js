'use strict';

/**
 * This inserts entries in following tables for highest block of origin chain,
 * 1] shard_by_blocks (shared) table,
 * 2] blocks (sharded) table,
 * 3] block_details (sharded )table
 * 4] also updates last processed block in chain_cron_data (shared) table
 *
 * Usage: node executables/oneTimers/insertInDDBForOriginHighestBlock.js
 *
 *
 * @module executables/oneTimers/insertInDDBForOriginHighestBlock
 */

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
    oThis.highestOriginBlock = null;
    oThis.BlockParser = null;
    oThis.chainCronDataModel = null;
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

    await oThis.initialize();

    // Create block parser object with highestOriginBlock as block to process
    let blockParser = new oThis.BlockParser(oThis.originChainId, {
      blockDelay: 0,
      blockToProcess: oThis.highestOriginBlock
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
            highestOriginBlock: oThis.highestOriginBlock
          }
        })
      );
    }

    await oThis._updateLastProcessedBlock(oThis.highestOriginBlock);

    logger.info('Created entries in DDB tables for current highest block on origin chain:', oThis.highestOriginBlock);
    return Promise.resolve(responseHelper.successWithData('Done with success.'));
  }

  /**
   * Get blockScanner object and initialize services.
   *
   * @return {Promise<void>}
   */
  async initialize() {
    const oThis = this;

    let providers = await oThis._getProvidersFromConfig(),
      provider = providers.data[0], //select one provider from provider endpoints array
      web3Instance = web3Provider.getInstance(provider).web3WsProvider;

    logger.info('Origin chain id-----------', oThis.originChainId);

    logger.info('Origin chain geth provider endpoint------', provider);

    // Get latest block on origin chain
    let getBlockResponse = await web3Instance.eth.getBlock('latest');

    // Get blockScanner object.
    const blockScannerObj = await blockScannerProvider.getInstance([oThis.originChainId]);

    // Get highest block on origin chain.
    oThis.highestOriginBlock = getBlockResponse['number'];
    logger.info('Current highest block on chain--------', oThis.highestOriginBlock);

    // Initialize BlockParser.
    oThis.BlockParser = blockScannerObj.block.Parser;
    oThis.chainCronDataModel = blockScannerObj.model.ChainCronData;

    return Promise.resolve();
  }

  /**
   * updateLastProcessedBlock
   *
   * @return {Promise<void>}
   */
  async _updateLastProcessedBlock(blockNumber) {
    const oThis = this;

    let chainCronDataObj = new oThis.chainCronDataModel({});

    let updateParams = {
      chainId: oThis.originChainId,
      lastFinalizedBlock: parseInt(blockNumber)
    };

    return chainCronDataObj.updateItem(updateParams);
  }

  /**
   * Get web3 providers' url for origin chain
   *
   * @return {Promise<any>}
   * @private
   */
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
