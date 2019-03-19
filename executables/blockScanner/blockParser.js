/**
 * This code acts as a master process to block scanner, which delegates the transactions from a block to
 * Transaction parser processes.
 *
 * Usage: node executables/blockScanner/blockParser.js cronProcessId
 *
 * Command Line Parameters Description:
 * cronProcessId: used for ensuring that no other process with the same cronProcessId can run on a given machine.
 *
 * @module executables/blockScanner/blockParser
 */
const program = require('commander');

const rootPrefix = '../..',
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  ErrorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  PublisherBase = require(rootPrefix + '/executables/rabbitmq/PublisherBase'),
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  BlockParserPendingTaskModel = require(rootPrefix + '/app/models/mysql/BlockParserPendingTask'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  web3InteractFactory = require(rootPrefix + '/lib/providers/web3'),
  rabbitmqProvider = require(rootPrefix + '/lib/providers/rabbitmq'),
  rabbitmqConstant = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  connectionTimeoutConst = require(rootPrefix + '/lib/globalConstant/connectionTimeout');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/blockScanner/blockParser.js --cronProcessId 1');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

// Declare variables.
const FAILURE_CODE = -1,
  MAX_TXS_PER_WORKER = 60,
  MIN_TXS_PER_WORKER = 10,
  BLOCKS_OFFSET = 20;

let parserStuckForBlocks = 0,
  notifierCalled = false;

/**
 * Class for Block parser
 *
 * @class
 */
class BlockParserExecutable extends PublisherBase {
  /**
   * Constructor for transaction parser
   *
   * @param {Object} params
   * @param {Number} params.cronProcessId: cron_processes table id
   *
   * @augments PublisherBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.canExit = true; // Denotes whether process can exit or not.
  }

  /**
   * Start cron related processing
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _start() {
    const oThis = this;

    // Fetch config strategy.
    await oThis._fetchConfigStrategy();

    // Get blockScanner object.
    const blockScanner = await blockScannerProvider.getInstance([oThis.chainId]);

    // Validate whether chainId exists in the chains table.
    await oThis._validateChainId(blockScanner);

    // Initialize certain variables.
    oThis._initializeBlockParser(blockScanner);

    // Warm up web3 pool.
    await oThis._warmUpWeb3Pool();

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

    // If startBlockNumber is not passed, then block parser will process from highest block in blocks table.
    if (oThis.startBlockNumber === null || oThis.startBlockNumber === undefined) {
      logger.warn('startBlockNumber is unavailable. Block parser would select highest block available in the DB.');
    }

    // If startBlockNumber is present, validate it.
    if (oThis.startBlockNumber && oThis.startBlockNumber < -1) {
      logger.error('Invalid startBlockNumber. Exiting the cron.');
      process.emit('SIGINT');
    }

    // If endBlockNumber is not passed, then block parser will not stop automatically.
    if (oThis.endBlockNumber === null || oThis.endBlockNumber === undefined) {
      logger.warn('endBlockNumber is unavailable. Block parser would not stop automatically.');
    }

    // If endBlockNumber is present, validate it.
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
   * Fetch config strategy and set isOriginChain, wsProviders and blockGenerationTime in oThis.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fetchConfigStrategy() {
    const oThis = this;

    // Fetch config strategy for chain id
    const strategyByChainHelperObj = new StrategyByChainHelper(oThis.chainId),
      configStrategyResp = await strategyByChainHelperObj.getComplete();

    // If config strategy not found, then emit SIGINT
    if (configStrategyResp.isFailure()) {
      logger.error('Could not fetch configStrategy. Exiting the process.');
      process.emit('SIGINT');
    }
    const configStrategy = configStrategyResp.data;

    // Check if it is origin chain
    oThis.isOriginChain = configStrategy[configStrategyConstants.originGeth].chainId == oThis.chainId;

    // Fetching wsProviders for _warmUpWeb3Pool method.
    oThis.wsProviders = oThis.isOriginChain
      ? configStrategy.originGeth.readOnly.wsProviders
      : configStrategy.auxGeth.readOnly.wsProviders;

    oThis.blockGenerationTime = oThis.isOriginChain
      ? configStrategy.originGeth.blockGenerationTime
      : configStrategy.auxGeth.blockGenerationTime;
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
  async _validateChainId(blockScannerObj) {
    const oThis = this;

    // Get ChainModel.
    const ChainModel = blockScannerObj.model.Chain,
      chainExists = await new ChainModel({}).checkIfChainIdExists(oThis.chainId),
      chainIdBooleanValidation = CommonValidators.validateBoolean(chainExists);

    // If response from checkIfChainIdExists is not a boolean, that means error object is returned.
    if (!chainIdBooleanValidation) {
      const errorObject = responseHelper.error({
        internal_error_identifier: 'something_went_wrong:e_bs_bp_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: {}
      });

      await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);

      process.emit('SIGINT');
    }

    // If response from checkIfChainIdExists is true or false, we make further checks.
    if (chainIdBooleanValidation && !chainExists) {
      logger.error('ChainId does not exist in the chains table.');

      const errorObject = responseHelper.error({
        internal_error_identifier: 'invalid_chain_id:e_bs_bp_2',
        api_error_identifier: 'invalid_chain_id',
        debug_options: {}
      });

      await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);

      process.emit('SIGINT');
    }

    logger.step('ChainID exists in chains table in dynamoDB.');
  }

  /**
   * Warm up web3 pool.
   *
   * @returns {Promise<void>}
   */
  async _warmUpWeb3Pool() {
    const oThis = this;

    let web3PoolSize = coreConstants.OST_WEB3_POOL_SIZE;

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
  _initializeBlockParser(blockScannerObj) {
    const oThis = this;

    // Initialize BlockParser.
    oThis.BlockParser = blockScannerObj.block.Parser;
    oThis.PendingTransactionModel = blockScannerObj.model.PendingTransaction;
    oThis.PendingTransactionByHashCache = blockScannerObj.cache.PendingTransactionByHash;

    // Initialize blockToProcess.
    if (oThis.startBlockNumber >= 0) {
      oThis.blockToProcess = oThis.startBlockNumber;
    } else {
      oThis.blockToProcess = null;
    }

    logger.step('Services initialized.');
  }

  /**
   * This method parses the blocks.
   *
   * @returns {Promise<void>}
   */
  async parseBlocks() {
    const oThis = this;

    while (true) {
      // Break out of loop if endBlockNumber was passed and has been reached OR stopPickingUpNewWork is set
      if ((oThis.endBlockNumber >= 0 && oThis.blockToProcess > oThis.endBlockNumber) || oThis.stopPickingUpNewWork) {
        oThis.canExit = true;
        break;
      }
      oThis.canExit = false;

      let blockParserOptions = {
        blockDelay: oThis.intentionalBlockDelay
      };

      // If blockToProcess is not null, pass it in options.
      if (oThis.blockToProcess !== null) {
        blockParserOptions.blockToProcess = oThis.blockToProcess;
      }

      let blockParser = new oThis.BlockParser(oThis.chainId, blockParserOptions);

      let blockParserResponse = await blockParser.perform();

      if (!blockParserResponse.isSuccess()) {
        parserStuckForBlocks++;
        // If blockParser returns an error then sleep for 10 ms and try again.
        await basicHelper.sleep(10);
        oThis.canExit = true;
        return;
      }

      // Load the obtained block level data into variables
      let blockParserData = blockParserResponse.data,
        rawCurrentBlock = blockParserData.rawCurrentBlock || {},
        nodesWithBlock = blockParserData.nodesWithBlock,
        currentBlock = blockParserData.currentBlock,
        nextBlockToProcess = blockParserData.nextBlockToProcess;

      let wasNewBlockParsed = currentBlock && currentBlock !== nextBlockToProcess;

      if (wasNewBlockParsed) {
        parserStuckForBlocks = 0;
        // If the block contains transactions, distribute those transactions.
        await oThis._distributeTransactions(rawCurrentBlock, nodesWithBlock);
        await basicHelper.sleep(10);
      } else {
        parserStuckForBlocks++;
        // Sleep for higher time, assuming new block will be there to parse.
        await basicHelper.sleep(oThis.blockGenerationTime * 1000);
      }

      oThis.blockToProcess = nextBlockToProcess;

      // We need to call notifier only once.
      if (!notifierCalled && oThis.intentionalBlockDelay + BLOCKS_OFFSET <= parserStuckForBlocks) {
        const errorObject = responseHelper.error({
          internal_error_identifier: 'block_parser_stuck:e_bs_bp_2',
          api_error_identifier: 'block_parser_stuck',
          debug_options: {}
        });

        await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);

        notifierCalled = true;
      }

      oThis.canExit = true;
    }
  }

  /**
   * This method distributes the transactions to transaction parser workers.
   *
   * @param {Object} rawCurrentBlock
   * @param {Array} nodesWithBlock
   *
   * @returns {Promise<number>}
   */
  async _distributeTransactions(rawCurrentBlock, nodesWithBlock) {
    const oThis = this;

    let transactions = rawCurrentBlock.transactions || [];

    // if no transactions present, nothing to do;
    if (transactions.length === 0) return;

    let blockHash = rawCurrentBlock.hash,
      blockNumber = rawCurrentBlock.number,
      filteredTxHashes = await oThis._filterOutUsingPendingTransaction(transactions),
      filteredTxCount = filteredTxHashes.length;

    logger.step(
      'Current processed block: ',
      blockNumber,
      'with Tx Count: ',
      transactions.length,
      'and filtered Tx Count:',
      filteredTxCount
    );

    // If no transactions filtered, then nothing to do.
    if (filteredTxCount.length === 0) return;

    let perBatchCount = filteredTxCount / nodesWithBlock.length,
      offset = 0;

    // Capping the per batch count both sides.
    perBatchCount = perBatchCount > MAX_TXS_PER_WORKER ? MAX_TXS_PER_WORKER : perBatchCount;
    perBatchCount = perBatchCount < MIN_TXS_PER_WORKER ? MIN_TXS_PER_WORKER : perBatchCount;

    let noOfBatches = parseInt(filteredTxCount / perBatchCount);
    noOfBatches += filteredTxCount % perBatchCount ? 1 : 0;

    logger.log('====Batch count', noOfBatches, '====Txs per batch', perBatchCount);

    let loopCount = 0;

    while (loopCount < noOfBatches) {
      let batchedTxHashes = filteredTxHashes.slice(offset, offset + perBatchCount);
      offset = offset + perBatchCount;

      if (batchedTxHashes.length === 0) break;

      let blockParserTaskModel = new BlockParserPendingTaskModel(),
        insertedRecord = await blockParserTaskModel.insertTask(oThis.chainId, blockNumber, batchedTxHashes);

      let messageParams = {
        topics: oThis._topicsToPublish,
        publisher: oThis._publisher,
        message: {
          kind: oThis._messageKind,
          payload: {
            chainId: oThis.chainId,
            blockHash: blockHash,
            taskId: insertedRecord.insertId,
            nodes: nodesWithBlock
          }
        }
      };

      let ostNotification = await oThis._getRabbitmqInstance(),
        publishToRmq = await ostNotification.publishEvent.perform(messageParams);

      // If could not set to RMQ run in async.
      if (publishToRmq.isFailure() || publishToRmq.data.publishedToRmq === 0) {
        logger.error("====Couldn't publish the message to RMQ====");
        return FAILURE_CODE;
      }

      logger.debug('===Published======batchedTxHashes', batchedTxHashes, '====from block: ', blockNumber);
      logger.log('====Published', batchedTxHashes.length, 'transactions', '====from block: ', blockNumber);
      loopCount++;
    }
  }

  /**
   * Fetch @ostdotcom/notification instance
   *
   * @return {*}
   * @private
   */
  _getRabbitmqInstance() {
    const oThis = this;

    let rabbitParams = {
      connectionWaitSeconds: connectionTimeoutConst.crons,
      switchConnectionWaitSeconds: connectionTimeoutConst.switchConnectionCrons
    };

    let rabbitKind = null;

    if (oThis.isOriginChain) {
      rabbitKind = rabbitmqConstant.originRabbitmqKind;
    } else {
      rabbitParams['auxChainId'] = oThis.chainId;
      rabbitKind = rabbitmqConstant.auxRabbitmqKind;
    }

    return rabbitmqProvider.getInstance(rabbitKind, rabbitParams);
  }

  /**
   * Filter out using pending transactions.
   *
   * @param {Array} blockTransactions
   *
   * @returns {Promise<Array>}
   */
  async _filterOutUsingPendingTransaction(blockTransactions) {
    const oThis = this;

    // If not origin chain, nothing to filter out.
    if (!oThis.isOriginChain) return blockTransactions;

    let allTxHahes = blockTransactions,
      intersectedTxHashes = [];

    while (true) {
      let batchedTxHashes = allTxHahes.splice(0, 50);

      if (batchedTxHashes.length <= 0) break;

      let pendingTransactionRsp = await new oThis.PendingTransactionByHashCache({
        chainId: oThis.chainId,
        transactionHashes: batchedTxHashes
      }).fetch();

      for (let txHash in pendingTransactionRsp.data) {
        if (CommonValidators.validateObject(pendingTransactionRsp.data[txHash])) {
          intersectedTxHashes.push(txHash);
        }
      }
    }

    return intersectedTxHashes;
  }

  /**
   * topics to publish
   *
   * @return {*[]}
   * @private
   */
  get _topicsToPublish() {
    const oThis = this;

    return ['transaction_parser_' + oThis.chainId];
  }

  /**
   * Publisher
   *
   * @return {string}
   * @private
   */
  get _publisher() {
    return 'OST';
  }

  /**
   * Message Kind
   *
   * @return {string}
   * @private
   */
  get _messageKind() {
    return 'background_job';
  }

  /**
   * Cron Kind
   *
   * @return {string}
   * @private
   */
  get _cronKind() {
    return cronProcessesConstants.blockParser;
  }
}

logger.step('Block parser process started.');

new BlockParserExecutable({ cronProcessId: +program.cronProcessId }).perform();

setInterval(function() {
  logger.info('Ending the process. Sending SIGINT.');
  process.emit('SIGINT');
}, cronProcessesConstants.blockParserRestartInterval);
