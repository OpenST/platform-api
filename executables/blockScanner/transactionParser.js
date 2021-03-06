/**
 * This code acts as a worker process for block scanner, which takes the transactions from block parser
 * and processes them.
 *
 * Usage: node executables/blockScanner/transactionParser.js cronProcessId
 *
 * Command Line Parameters Description:
 * cronProcessId: used for ensuring that no other process with the same cronProcessId can run on a given machine.
 *
 * @module executables/blockScanner/transactionParser.
 */

const program = require('commander');

const rootPrefix = '../..',
  ErrorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  RabbitmqSubscription = require(rootPrefix + '/lib/entity/RabbitSubscription'),
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  MultiSubscriptionBase = require(rootPrefix + '/executables/rabbitmq/MultiSubscriptionBase'),
  BlockParserPendingTaskModel = require(rootPrefix + '/app/models/mysql/BlockParserPendingTask'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  web3InteractFactory = require(rootPrefix + '/lib/providers/web3'),
  rabbitmqConstants = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  PostTransactionMinedSteps = require(rootPrefix + '/lib/transactions/PostTransactionMinedSteps'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

// Declare variables.
const TX_BATCH_SIZE = 20;

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/blockScanner/transactionParser.js --cronProcessId 1');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

/**
 * Class for transaction parser.
 *
 * @class TransactionParser
 */
class TransactionParser extends MultiSubscriptionBase {
  /**
   * Constructor for transaction parser.
   *
   * @param {object} params
   * @param {number} params.cronProcessId: cron_processes table id
   *
   * @augments MultiSubscriptionBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);
  }

  /**
   * Process name prefix.
   *
   * @returns {string}
   * @private
   */
  get _processNamePrefix() {
    return 'transaction_parser';
  }

  /**
   * Topics to subscribe.
   *
   * @returns {*[]}
   * @private
   */
  get _topicsToSubscribe() {
    const oThis = this;

    return ['transaction_parser_' + oThis.chainId];
  }

  /**
   * Queue name.
   *
   * @returns string
   * @private
   */
  get _queueName() {
    const oThis = this;

    return 'transaction_parser_' + oThis.chainId;
  }

  /**
   * Specific validations apart from common validations.
   *
   * @returns {Promise<never>}
   * @private
   */
  _specificValidations() {
    const oThis = this;

    if (!oThis.chainId) {
      const errMsg = 'Chain ID is un-available in cron params in the database.';
      logger.error(errMsg);

      return Promise.reject(errMsg);
    }

    if (oThis.chainId < 0) {
      const errMsg = 'Chain ID is invalid.';
      logger.error(errMsg);

      return Promise.reject(errMsg);
    }
  }

  /**
   * Cron kind.
   *
   * @return string
   * @private
   */
  get _cronKind() {
    return cronProcessesConstants.transactionParser;
  }

  /**
   * Warm up web3 pool before init.
   *
   * @returns {Promise<void>}
   */
  async _beforeSubscribe() {
    // Fetch config strategy by chainId.
    const oThis = this;

    await oThis._fetchConfigStrategy();

    // Get blockScanner object.
    const blockScanner = await blockScannerProvider.getInstance([oThis.chainId]);

    // Validate whether chainId exists in the chains table.
    await oThis._validateChainId(blockScanner);

    oThis._initializeTransactionParser(blockScanner);

    await oThis._warmUpWeb3Pool();

    logger.step('Services initialised.');
  }

  /**
   * Prepare subscription data.
   *
   * @returns {{}}
   * @private
   */
  _prepareSubscriptionData() {
    const oThis = this;

    const rabbitParams = {
      topic: oThis._topicsToSubscribe[0],
      queue: oThis._queueName,
      prefetchCount: oThis.prefetchCount
    };

    if (oThis.isOriginChain) {
      rabbitParams.rabbitmqKind = rabbitmqConstants.originRabbitmqKind;
    } else {
      rabbitParams.auxChainId = oThis.chainId;
      rabbitParams.rabbitmqKind = rabbitmqConstants.auxRabbitmqKind;
    }

    oThis.subscriptionTopicToDataMap[oThis._topicsToSubscribe[0]] = new RabbitmqSubscription(rabbitParams);
  }

  /**
   * This method calls the transaction parser and token transfer parser services as needed.
   *
   * @param {string} messageParams
   *
   * @returns {Promise<*>}
   */
  async _processMessage(messageParams) {
    const oThis = this,
      payload = messageParams.message.payload,
      chainId = payload.chainId.toString(),
      blockHash = payload.blockHash,
      taskId = payload.taskId,
      nodes = payload.nodes;

    // Fetch Task from table
    const blockParserTaskModel = new BlockParserPendingTaskModel(),
      blockParserTasks = await blockParserTaskModel.fetchTask(taskId);

    if (blockParserTasks.length <= 0) {
      logger.error(
        'e_bs_tp_3',
        'Error in transaction parsing.',
        'Transaction parsing response: ',
        'Could not fetch details for pending task: ',
        taskId
      );

      // ACK RMQ.
      return;
    }

    // Fetch block number and transaction hashes from query response.
    const blockNumber = blockParserTasks[0].block_number,
      transactionHashes = JSON.parse(blockParserTasks[0].transaction_hashes);

    // Validate if current block hash on GETH and in table are same.
    const blockValidationResponse = await oThis._verifyBlockNumberAndBlockHash(blockNumber, blockHash, nodes),
      blockVerified = blockValidationResponse.blockVerified,
      rawBlock = blockValidationResponse.rawBlock;

    // Block hash of block number passed and block hash received from params don't match.
    if (!blockVerified) {
      logger.error('Hash of block number: ', blockNumber, ' does not match the blockHash: ', blockHash, '.');
      const errorObject = responseHelper.error({
        internal_error_identifier: 'block_hash_dont_match:e_bs_tp_4',
        api_error_identifier: 'block_hash_dont_match',
        debug_options: { blockNumber: blockNumber, blockHash: blockHash }
      });

      // Delete block parser pending task if block hash is not verified.
      await new BlockParserPendingTaskModel().deleteTask(taskId);

      await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.mediumSeverity);

      // ACK RMQ.
      return;
    }

    // Create object of transaction parser.
    const transactionParser = new oThis.TransactionParser(chainId, rawBlock, transactionHashes, nodes);

    // Start transaction parser service.
    const transactionParserResponse = await transactionParser.perform();

    // If transaction parser returns error, then delete the task from table and ACK RMQ
    if (!transactionParserResponse.isSuccess()) {
      // Delete block parser pending task if transaction parser took it.
      await new BlockParserPendingTaskModel().deleteTask(taskId);

      // Transaction parsing response was unsuccessful.

      logger.error(
        'e_bs_tp_4',
        'Error in transaction parsing.',
        'Transaction parsing response: ',
        transactionParserResponse
      );

      // ACK RMQ.
      return;
    }

    // Fetch data from transaction parser response.
    const transactionReceiptMap = transactionParserResponse.data.transactionReceiptMap || {},
      unprocessedItems = transactionParserResponse.data.unprocessedTransactions || [],
      processedReceipts = {};

    const unprocessedItemsMap = {};
    let tokenParserNeeded = false;

    for (let index = 0; index < unprocessedItems.length; index++) {
      unprocessedItemsMap[unprocessedItems[index]] = 1;
    }

    const txHashList = [];

    for (const txHash in transactionReceiptMap) {
      if (!unprocessedItemsMap[txHash] && transactionReceiptMap[txHash]) {
        txHashList.push(txHash);
        processedReceipts[txHash] = transactionReceiptMap[txHash];
        tokenParserNeeded = true;
      }
    }

    let postTrxMinedObj = new PostTransactionMinedSteps({chainId: oThis.chainId,
      transactionHashes: txHashList, transactionReceiptMap: transactionReceiptMap});

    await postTrxMinedObj.perform().catch(function(error) {
      // As we have code in finalizer to check and update statuses (if needed) we ignore any errors from here and proceed.
      logger.error('_updateStatusesInDb failed in transactionParser', error);
    });

    // If token transfer parsing not needed, ACK RMQ
    if (!tokenParserNeeded) {
      logger.log('Token transfer parsing not needed.');

      // Delete block parser pending task if token parser is not needed.
      await new BlockParserPendingTaskModel().deleteTask(taskId);

      // ACK RMQ.
      return;
    }

    const tokenTransferParserResponse = await new oThis.TokenTransferParser(
      chainId,
      rawBlock,
      processedReceipts,
      nodes
    ).perform();

    // Delete block parser pending task if transaction parser is done.
    await new BlockParserPendingTaskModel().deleteTask(taskId);

    if (tokenTransferParserResponse.isSuccess()) {
      // Token transfer parser was successful.
    } else {
      // If token transfer parsing failed.
      logger.error(
        'e_bs_w_3',
        'Token transfer parsing unsuccessful.',
        'Token transfer parsing response: ',
        tokenTransferParserResponse
      );
    }
  }

  /**
   * Fetch config strategy and set isOriginChain, wsProviders and blockGenerationTime in oThis.
   *
   * @return {Promise<void>}
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
  }

  /**
   * This method validates whether the chainId passed actually exists in the chains
   * table in DynamoDB or not. This method internally initialises certain services
   * sets some variables as well.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _validateChainId(blockScannerObj) {
    const oThis = this;

    // Get ChainModel.
    const ChainModel = blockScannerObj.model.Chain,
      chainExists = await new ChainModel({}).checkIfChainIdExists(oThis.chainId);

    if (!chainExists) {
      logger.error('ChainId does not exist in the chains table.');
      process.emit('SIGINT');
    }

    logger.step('ChainID exists in chains table in dynamoDB.');
  }

  /**
   * Initialize transaction parser object.
   *
   * @param {object} blockScannerObj
   *
   * @sets oThis.TransactionParser, oThis.TokenTransferParser
   *
   * @private
   */
  _initializeTransactionParser(blockScannerObj) {
    const oThis = this;

    oThis.TransactionParser = blockScannerObj.transaction.Parser;
    oThis.TokenTransferParser = blockScannerObj.transfer.Parser;
  }

  /**
   * Warm up web3 pool.
   *
   * @returns {Promise<void>}
   */
  async _warmUpWeb3Pool() {
    const oThis = this;

    const web3PoolSize = coreConstants.OST_WEB3_POOL_SIZE;

    for (let index = 0; index < oThis.wsProviders.length; index++) {
      const provider = oThis.wsProviders[index];
      for (let web3PoolIndex = 0; web3PoolIndex < web3PoolSize; web3PoolIndex++) {
        web3InteractFactory.getInstance(provider);
      }
    }

    logger.step('Web3 pool warmed up.');
  }

  /**
   * Start subscription.
   *
   * @return {Promise<void>}
   * @private
   */
  async _startSubscription() {
    const oThis = this;

    await oThis._startSubscriptionFor(oThis._topicsToSubscribe[0]);
  }

  /**
   * This method verifies the blockHash received with the actual blockHash of
   * the passed blockNumber.
   *
   * @param {number} blockNumber
   * @param {string} blockHash
   * @param {array} nodes
   *
   * @returns {Promise<Boolean>}
   * @private
   */
  async _verifyBlockNumberAndBlockHash(blockNumber, blockHash, nodes) {
    const web3Interact = web3InteractFactory.getInstance(nodes[0]),
      rawBlock = await web3Interact.getBlock(blockNumber);

    const correctBlockHash = rawBlock.hash,
      blockVerified = correctBlockHash === blockHash;
    // We are not setting rawBlock in oThis as it might change during the course of execution of process.

    return Promise.resolve({
      blockVerified: blockVerified,
      rawBlock: rawBlock
    });
  }
}

logger.step('Transaction parser process started.');

new TransactionParser({ cronProcessId: +program.cronProcessId }).perform();

setInterval(function() {
  logger.info('Ending the process. Sending SIGINT.');
  process.emit('SIGINT');
}, cronProcessesConstants.continuousCronRestartInterval);
