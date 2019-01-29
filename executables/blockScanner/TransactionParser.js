'use strict';
/**
 * This code acts as a worker process for block scanner, which takes the transactions from block parser
 * and processes them.
 *
 * Usage: node executables/blockScanner/TransactionParser.js cronProcessId
 *
 * Command Line Parameters Description:
 * cronProcessId: used for ensuring that no other process with the same cronProcessId can run on a given machine.
 *
 * @module executables/blockScanner/TransactionParser.
 */

const rootPrefix = '../..',
  program = require('commander'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  web3InteractFactory = require(rootPrefix + '/lib/providers/web3'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  SubscriberBase = require(rootPrefix + '/executables/rabbitmq/SubscriberBase'),
  BlockParserPendingTask = require(rootPrefix + '/app/models/mysql/BlockParserPendingTask');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/blockScanner/TransactionParser.js --cronProcessId 1');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

class TransactionParser extends SubscriberBase {
  /**
   * Constructor for transaction parser
   *
   * @param params {object} - params object
   * @param params.cronProcessId {number} - cron_processes table id
   *
   * @constructor
   */
  constructor(params) {
    super(params);
  }

  /**
   * process name prefix
   *
   * @returns {string}
   * @private
   */
  get _processNamePrefix() {
    return 'transaction_parser';
  }

  /**
   * Topics to subscribe
   *
   * @returns {*[]}
   *
   * @private
   */
  get _topicsToSubscribe() {
    const oThis = this;

    return ['transaction_parser_' + oThis.chainId];
  }

  /**
   * queue name
   *
   * @returns {string}
   * @private
   */
  get _queueName() {
    const oThis = this;

    return 'transaction_parser_' + oThis.chainId;
  }

  /**
   * Specific validations apart from common validations
   *
   * @private
   */
  _specificValidations() {
    const oThis = this;

    if (!oThis.chainId) {
      logger.error('Chain ID is un-available in cron params in the database.');
      process.emit('SIGINT');
    }

    if (oThis.chainId < 0) {
      logger.error('Chain ID is invalid.');
      process.emit('SIGINT');
    }
  }

  get _cronKind() {
    return cronProcessesConstants.transactionParser;
  }

  /**
   * Warm up web3 pool before init
   *
   * @returns {Promise<void>}
   */
  async _beforeSubscribe() {
    // Fetch config strategy by chainId.
    const oThis = this,
      strategyByChainHelperObj = new StrategyByChainHelper(oThis.chainId),
      configStrategyResp = await strategyByChainHelperObj.getComplete();

    if (configStrategyResp.isFailure()) {
      logger.error('Could not fetch configStrategy. Exiting the process.');
      process.emit('SIGINT');
    }

    const configStrategy = configStrategyResp.data,
      web3PoolSize = coreConstants.OST_WEB3_POOL_SIZE,
      wsProviders = configStrategy.hasOwnProperty('auxGeth')
        ? configStrategy.auxGeth.readOnly.wsProviders
        : configStrategy.originGeth.readOnly.wsProviders;

    logger.log('====Warming up geth pool for providers====', wsProviders);

    for (let index = 0; index < wsProviders.length; index++) {
      let provider = wsProviders[index];
      for (let i = 0; i < web3PoolSize; i++) {
        web3InteractFactory.getInstance(provider);
      }
    }

    logger.step('Web3 pool warmed up.');

    // Get blockScanner object.
    oThis.blockScannerObj = await blockScannerProvider.getInstance([oThis.chainId]);

    oThis.TransactionParser = oThis.blockScannerObj.transaction.Parser;
    oThis.TokenTransferParser = oThis.blockScannerObj.transfer.Parser;

    logger.step('Services initialised.');
  }

  /**
   * This method calls the transaction parser and token transfer parser services as needed.
   *
   * @param {String} messageParams
   *
   * @returns {Promise<*>}
   */
  async _processMessage(messageParams) {
    const oThis = this;

    // Process request
    const payload = messageParams.message.payload;

    // Fetch params from payload.
    const chainId = payload.chainId.toString(),
      blockHash = payload.blockHash,
      taskId = payload.taskId,
      nodes = payload.nodes;

    let blockParserTaskObj = new BlockParserPendingTask(),
      blockParserTasks = await blockParserTaskObj.fetchTask(taskId);

    if (blockParserTasks.length <= 0) {
      logger.error(
        'e_bs_tp_3',
        'Error in transaction parsing. unAckCount ->',
        oThis.unAckCount,
        'Transaction parsing response: ',
        'Could not fetch details for pending task: ',
        taskId
      );
      // ACK RMQ.
      return Promise.resolve();
    }

    const blockNumber = blockParserTasks[0].block_number,
      transactionHashes = JSON.parse(blockParserTasks[0].transaction_hashes);

    const blockValidationResponse = await oThis._verifyBlockNumberAndBlockHash(blockNumber, blockHash, nodes),
      blockVerified = blockValidationResponse.blockVerified,
      rawBlock = blockValidationResponse.rawBlock;

    // Block hash of block number passed and block hash received from params don't match.
    if (!blockVerified) {
      logger.error('Hash of block number: ', blockNumber, ' does not match the blockHash: ', blockHash, '.');
      // logger.notify(); TODO: Add this.
      logger.debug('------unAckCount -> ', oThis.unAckCount);
      // ACK RMQ.
      return Promise.resolve();
    } else {
      // Block hash of block number passed and block hash received from params are the same.

      // Create object of transaction parser.
      let transactionParser = new oThis.TransactionParser(chainId, rawBlock, transactionHashes, nodes);

      // Start transaction parser service.
      const transactionParserResponse = await transactionParser.perform();

      if (transactionParserResponse.isSuccess()) {
        // Fetch data from transaction parser response.
        let transactionReceiptMap = transactionParserResponse.data.transactionReceiptMap || {},
          unprocessedItems = transactionParserResponse.data.unprocessedTransactions || [],
          processedReceipts = {};

        let unprocessedItemsMap = {},
          tokenParserNeeded = false;

        for (let index = 0; index < unprocessedItems.length; index++) {
          unprocessedItemsMap[unprocessedItems[index]] = 1;
        }

        for (let txHash in transactionReceiptMap) {
          if (!unprocessedItemsMap[txHash] && transactionReceiptMap[txHash]) {
            processedReceipts[txHash] = transactionReceiptMap[txHash];
            tokenParserNeeded = true;
          }
        }

        // Call token parser if it is needed.
        if (tokenParserNeeded) {
          const tokenTransferParserResponse = await new oThis.TokenTransferParser(
            chainId,
            rawBlock,
            processedReceipts,
            nodes
          ).perform();

          // Delete block parser pending task if transaction parser is done.
          new BlockParserPendingTask().deleteTask(taskId);

          if (tokenTransferParserResponse.isSuccess()) {
            // Token transfer parser was successful.
            // TODO: Add dirty balances entry in MySQL.
            // TODO: Chainable
            logger.debug('------unAckCount -> ', oThis.unAckCount);
            // ACK RMQ.
            return Promise.resolve();
          } else {
            // If token transfer parsing failed.

            logger.error(
              'e_bs_w_3',
              'Token transfer parsing unsuccessful. unAckCount ->',
              oThis.unAckCount,
              'Token transfer parsing response: ',
              tokenTransferParserResponse
            );
            // ACK RMQ.
            return Promise.resolve();
          }
        } else {
          // If token transfer parsing not needed.

          logger.log('Token transfer parsing not needed.');
          logger.debug('------unAckCount -> ', oThis.unAckCount);
          // ACK RMQ.
          return Promise.resolve();
        }
      } else {
        // Delete block parser pensing task if transaction parser took it.
        new BlockParserPendingTask().deleteTask(taskId);

        // Transaction parsing response was unsuccessful.

        logger.error(
          'e_bs_tp_4',
          'Error in transaction parsing. unAckCount ->',
          oThis.unAckCount,
          'Transaction parsing response: ',
          transactionParserResponse
        );
        // ACK RMQ.
        return Promise.resolve();
      }
    }
  }

  /**
   * This method verifies the blockHash received with the actual blockHash of
   * the passed blockNumber
   *
   * @param {Number} blockNumber
   * @param {String} blockHash
   * @param {Array} nodes
   *
   * @returns {Promise<Boolean>}
   *
   * @private
   */
  async _verifyBlockNumberAndBlockHash(blockNumber, blockHash, nodes) {
    const oThis = this;

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
}, 45 * 60 * 1000);
