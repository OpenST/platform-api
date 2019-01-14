'use strict';
/**
 * This code acts as a master process to block scanner, which delegates the transactions from a block to
 * Transaction parser processes.
 *
 * Usage: node executables/blockScanner/BlockParser.js cronProcessId
 *
 * Command Line Parameters Description:
 * cronProcessId: used for ensuring that no other process with the same cronProcessId can run on a given machine.
 *
 * @module executables/blockScanner/BlockParser
 */
const rootPrefix = '../..',
  program = require('commander'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  web3InteractFactory = require(rootPrefix + '/lib/providers/web3'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  PublisherBase = require(rootPrefix + '/executables/rabbitmq/PublisherBase'),
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  sharedRabbitMqProvider = require(rootPrefix + '/lib/providers/sharedNotification'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  connectionTimeoutConst = require(rootPrefix + '/lib/globalConstant/connectionTimeout');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/blockScanner/BlockParser.js --cronProcessId 1');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

const FAILURE_CODE = -1,
  MAX_TXS_PER_WORKER = 60,
  MIN_TXS_PER_WORKER = 10;

/**
 * Class for Block parser
 *
 * @class
 */
class BlockParser extends PublisherBase {
  /**
   * Constructor for transaction parser
   *
   * @param {Object} params
   * @param {Number} params.cronProcessId: cron_processes table id
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.canExit = true; // Denotes whether process can exit or not.
  }

  async _start() {
    const oThis = this;

    // Validate whether chainId exists in the chains table.
    await oThis._validateChainId();

    // Warm up web3 pool.
    await oThis.warmUpWeb3Pool();

    // Parse blocks.
    await oThis.parseBlocks();
  }

  /**
   * Sanitizes and validates the input parameters. ChainId is not validated here as it is already validated
   * before calling the perform method of the class.
   *
   * @private
   */
  _specificValidations() {
    const oThis = this;

    // Validate startBlockNumber.
    if (oThis.startBlockNumber === null || oThis.startBlockNumber === undefined) {
      logger.warn('startBlockNumber is unavailable. Block parser would select highest block available in the DB.');
    }
    if (oThis.startBlockNumber && oThis.startBlockNumber < -1) {
      logger.error('Invalid startBlockNumber. Exiting the cron.');
      process.emit('SIGINT');
    }

    // Validate endBlockNumber.
    if (oThis.endBlockNumber === null || oThis.endBlockNumber === undefined) {
      logger.warn('endBlockNumber is unavailable. Block parser would not stop automatically.');
    }
    if (oThis.endBlockNumber && oThis.endBlockNumber < -1) {
      logger.error('Invalid endBlockNumber. Exiting the cron.');
      process.emit('SIGINT');
    }

    // Validate intentionalBlockDelay
    if (oThis.intentionalBlockDelay < 0) {
      logger.error('Invalid intentionalBlockDelay. Exiting the cron.');
      process.emit('SIGINT');
    }

    logger.step('All validations done.');
  }

  /**
   * This method validates whether the chainId passed actually exists in the chains
   * table in DynamoDB or not. This method internally initialises certain services
   * sets some variables as well.
   *
   * @private
   *
   * @returns {Promise<void>}
   */
  async _validateChainId() {
    // Fetch config strategy by chainId.
    const oThis = this,
      strategyByChainHelperObj = new StrategyByChainHelper(oThis.chainId),
      configStrategyResp = await strategyByChainHelperObj.getComplete();

    if (configStrategyResp.isFailure()) {
      logger.error('Could not fetch configStrategy. Exiting the process.');
      process.emit('SIGINT');
    }

    const configStrategy = configStrategyResp.data;

    // Fetching wsProviders for warmUpWeb3Pool method.
    oThis.wsProviders = configStrategy.auxGeth.readOnly.wsProviders;

    // Get blockScanner object.
    const blockScannerObj = await blockScannerProvider.getInstance([oThis.chainId]);

    // Get ChainModel.
    const ChainModel = blockScannerObj.model.Chain,
      chainExists = await new ChainModel({}).checkIfChainIdExists(oThis.chainId);

    if (!chainExists) {
      logger.error('ChainId does not exist in the chains table.');
      process.emit('SIGINT');
    }

    // Initialize certain variables.
    oThis._init(blockScannerObj);

    logger.step('ChainID exists in chains table in dynamoDB.');
  }

  /**
   * Warm up web3 pool.
   *
   * @returns {Promise<void>}
   */
  async warmUpWeb3Pool() {
    const oThis = this;

    let web3PoolSize = coreConstants.OST_WEB3_POOL_SIZE;

    logger.log('====Warming up geth pool for providers====', oThis.wsProviders);

    for (let index = 0; index < oThis.wsProviders.length; index++) {
      let provider = oThis.wsProviders[index];
      for (let i = 0; i < web3PoolSize; i++) {
        web3InteractFactory.getInstance(provider);
      }
    }

    logger.step('Web3 pool warmed up.');
  }

  /**
   * Initializes block parser service and blockToProcess.
   *
   * @param {Object} blockScannerObj
   *
   * @private
   */
  _init(blockScannerObj) {
    const oThis = this;

    // Initialize BlockParser.
    oThis.BlockParser = blockScannerObj.block.Parser;

    // Initialize blockToProcess.
    if (oThis.startBlockNumber >= 0) {
      oThis.blockToProcess = oThis.startBlockNumber;
    } else {
      oThis.blockToProcess = null;
    }

    logger.step('Services initialised.');
  }

  /**
   * This method parses the blocks.
   *
   * @returns {Promise<void>}
   */
  async parseBlocks() {
    const oThis = this;

    while (true) {
      if ((oThis.endBlockNumber >= 0 && oThis.blockToProcess > oThis.endBlockNumber) || oThis.stopPickingUpNewWork) {
        oThis.canExit = true;
        break;
      }
      oThis.canExit = false;

      let blockParser, blockParserResponse;

      // If blockToProcess is null, don't pass that.

      if (oThis.blockToProcess === null) {
        blockParser = new oThis.BlockParser(oThis.chainId, {
          blockDelay: oThis.intentionalBlockDelay
        });
        blockParserResponse = await blockParser.perform();
      } else {
        blockParser = new oThis.BlockParser(oThis.chainId, {
          blockDelay: oThis.intentionalBlockDelay,
          blockToProcess: oThis.blockToProcess
        });
        blockParserResponse = await blockParser.perform();
      }

      if (blockParserResponse.isSuccess()) {
        // Load the obtained block level data into variables
        let blockParserData = blockParserResponse.data,
          rawCurrentBlock = blockParserData.rawCurrentBlock || {},
          nodesWithBlock = blockParserData.nodesWithBlock,
          currentBlock = blockParserData.currentBlock,
          nextBlockToProcess = blockParserData.nextBlockToProcess,
          transactions = rawCurrentBlock.transactions || [];

        // If current block is not same as nextBlockToProcess, it means there
        // are more blocks to process; so sleep time is less.
        if (currentBlock !== nextBlockToProcess) {
          // If the block contains transactions, distribute those transactions.
          if (transactions.length > 0) {
            await oThis.distributeTransactions(rawCurrentBlock, nodesWithBlock);
          }
          await oThis.sleep(10);
        } else {
          await oThis.sleep(2000);
        }

        oThis.blockToProcess = nextBlockToProcess;

        logger.step('Current Processed block: ', currentBlock, 'with Tx Count: ', transactions.length);
      } else {
        // If blockParser returns an error then sleep for 10 ms and try again.
        await oThis.sleep(10);
      }

      oThis.canExit = true;
    }

    return Promise.resolve();
  }

  /**
   * This method distributes the transactions to transaction parser workers.
   *
   * @param {Object} rawCurrentBlock
   * @param {Array} nodesWithBlock
   *
   * @returns {Promise<number>}
   */
  async distributeTransactions(rawCurrentBlock, nodesWithBlock) {
    const oThis = this;

    let blockHash = rawCurrentBlock.hash,
      blockNumber = rawCurrentBlock.number,
      transactionsInCurrentBlock = rawCurrentBlock.transactions,
      totalTransactionCount = transactionsInCurrentBlock.length,
      perBatchCount = totalTransactionCount / nodesWithBlock.length,
      offset = 0;

    // Capping the per batch count both sides.
    perBatchCount = perBatchCount > MAX_TXS_PER_WORKER ? MAX_TXS_PER_WORKER : perBatchCount;
    perBatchCount = perBatchCount < MIN_TXS_PER_WORKER ? MIN_TXS_PER_WORKER : perBatchCount;

    let noOfBatches = parseInt(totalTransactionCount / perBatchCount);
    noOfBatches += totalTransactionCount % perBatchCount ? 1 : 0;

    logger.log('====Batch count', noOfBatches, '====Txs per batch', perBatchCount);

    let loopCount = 0;

    while (loopCount < noOfBatches) {
      let batchedTxHashes = transactionsInCurrentBlock.slice(offset, offset + perBatchCount);

      offset = offset + perBatchCount;

      if (batchedTxHashes.length === 0) break;

      let messageParams = {
        topics: oThis._topicsToPublish,
        publisher: oThis._publisher,
        message: {
          kind: oThis._messageKind,
          payload: {
            chainId: oThis.chainId,
            blockHash: blockHash,
            transactionHashes: batchedTxHashes,
            blockNumber: blockNumber,
            nodes: nodesWithBlock
          }
        }
      };

      let openSTNotification = await sharedRabbitMqProvider.getInstance({
          connectionWaitSeconds: connectionTimeoutConst.crons,
          switchConnectionWaitSeconds: connectionTimeoutConst.switchConnectionCrons
        }),
        setToRMQ = await openSTNotification.publishEvent.perform(messageParams);

      // If could not set to RMQ run in async.
      if (setToRMQ.isFailure() || setToRMQ.data.publishedToRmq === 0) {
        logger.error("====Couldn't publish the message to RMQ====");
        return FAILURE_CODE;
      }

      logger.debug('===Published======batchedTxHashes', batchedTxHashes, '====from block: ', blockNumber);
      logger.log('====Published', batchedTxHashes.length, 'transactions', '====from block: ', blockNumber);
      loopCount++;
    }
  }

  get _topicsToPublish() {
    const oThis = this;

    return ['transaction_parser_' + oThis.chainId];
  }

  get _publisher() {
    return 'OST';
  }

  get _messageKind() {
    return 'background_job';
  }

  get _cronKind() {
    return cronProcessesConstants.blockParser;
  }
}

logger.step('Block parser process started.');

new BlockParser({ cronProcessId: +program.cronProcessId }).perform();
