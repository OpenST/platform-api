'use strict';
/**
 * This code acts as a worker process for block scanner, which takes the transactions from delegator
 * and processes them.
 *
 * Usage: node executables/blockScanner/Worker.js cronProcessId
 *
 * Command Line Parameters Description:
 * cronProcessId: used for ensuring that no other process with the same cronProcessId can run on a given machine.
 *
 * @module executables/blockScanner/Worker.
 */
const OSTBase = require('@openstfoundation/openst-base');

const rootPrefix = '../..',
  program = require('commander'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  web3InteractFactory = require(rootPrefix + '/lib/providers/web3'),
  SigIntHandler = require(rootPrefix + '/executables/SigintHandler'),
  CronProcessesHandler = require(rootPrefix + '/lib/CronProcessesHandler'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  sharedRabbitMqProvider = require(rootPrefix + '/lib/providers/sharedNotification'),
  connectionTimeoutConst = require(rootPrefix + '/lib/globalConstant/connectionTimeout');

const cronProcessHandler = new CronProcessesHandler();

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/blockScanner/Worker.js --cronProcessId 1');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

// Declare variables.
const cronKind = cronProcessesConstants.blockScannerWorker;

let unAckCount = 0,
  chainId,
  prefetchCount;

/**
 * Class for block scanner worker
 *
 * @class
 */
class BlockScannerWorker extends SigIntHandler {
  /**
   * Constructor for block scanner worker
   *
   * @param {Object} params
   * @param {Number} params.chainId
   * @param {Number} params.prefetchCount
   *
   * @constructor
   */
  constructor(params) {
    super({
      id: program.cronProcessId
    });

    const oThis = this;

    oThis.chainId = params.chainId;
    oThis.prefetchCount = params.prefetchCount;

    // Initialize PromiseQueueManager.
    oThis.PromiseQueueManager = new OSTBase.OSTPromise.QueueManager(
      function(...args) {
        // Promise executor should be a static method by itself. We declared an unnamed function
        // which was a static method, and promiseExecutor was passed in the same scope as that
        // of the class with oThis preserved.
        oThis._promiseExecutor(...args);
      },
      {
        name: 'blockscanner_promise_queue_manager',
        timeoutInMilliSecs: 3 * 60 * 1000, //3 minutes
        maxZombieCount: Math.round(oThis.prefetchCount * 0.25),
        onMaxZombieCountReached: function() {
          logger.warn('e_bs_w_1', 'maxZombieCount reached. Triggering SIGTERM.');
          // Trigger gracefully shutdown of process.
          process.kill(process.pid, 'SIGTERM'); // TODO: Get this verified.
        }
      }
    );

    oThis.attachHandlers(); // Attaching handlers from sigint handler.
  }

  /**
   * Main performer method for the class.
   *
   * @returns {Promise<>}
   */
  perform() {
    const oThis = this;

    logger.step('Block scanner worker process started.');

    return oThis.asyncPerform().catch(function(err) {
      // If asyncPerform fails, run the below catch block.
      logger.error(' In catch block of executables/blockScanner/Worker.js');
      return responseHelper.error({
        internal_error_identifier: 'e_bs_w_2',
        api_error_identifier: 'something_went_wrong',
        debug_options: err
      });
    });
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this;

    // Validate and sanitize input parameters.
    oThis._validateAndSanitize();

    // Warm up web3 pool.
    await oThis.warmUpWeb3Pool();

    // Initialize certain variables.
    await oThis._init();

    // Initialize certain variables.
    await oThis.startSubscription();
  }

  /**
   * Sanitizes and validates the input parameters.
   *
   * @private
   */
  _validateAndSanitize() {
    const oThis = this;

    if (!oThis.chainId) {
      logger.error('Chain ID is un-available in cron params in the database.');
      process.emit('SIGINT');
    }

    if (oThis.chainId < 0) {
      logger.error('Chain ID is invalid.');
      process.emit('SIGINT');
    }

    if (!oThis.prefetchCount) {
      logger.error('Prefetch count un-available in cron params in the database.');
      process.emit('SIGINT');
    }

    if (oThis.prefetchCount < 0) {
      logger.error('Prefetch count is invalid.');
      process.emit('SIGINT');
    }

    logger.step('All validations done.');
  }

  /**
   * Warm up web3 pool.
   *
   * @returns {Promise<void>}
   */
  async warmUpWeb3Pool() {
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
      wsProviders = configStrategy.auxGeth.readOnly.wsProviders;

    logger.log('====Warming up geth pool for providers====', wsProviders);

    for (let index = 0; index < wsProviders.length; index++) {
      let provider = wsProviders[index];
      for (let i = 0; i < web3PoolSize; i++) {
        web3InteractFactory.getInstance(provider);
      }
    }

    logger.step('Web3 pool warmed up.');
  }

  /**
   * Initializes block scanner service provider, transaction parser service and transfer parser service.
   *
   * @private
   */
  async _init() {
    const oThis = this;

    // Get blockScanner object.
    oThis.blockScannerObj = await blockScannerProvider.getInstance([oThis.chainId]);

    oThis.TransactionParser = oThis.blockScannerObj.transaction.Parser;
    oThis.TokenTransferParser = oThis.blockScannerObj.transfer.Parser;

    logger.step('Services initialised.');
  }

  /**
   * Start subscription.
   *
   * @returns {Promise<void>}
   */
  async startSubscription() {
    const oThis = this;

    const openStNotification = await sharedRabbitMqProvider.getInstance({
      connectionWaitSeconds: connectionTimeoutConst.crons,
      switchConnectionWaitSeconds: connectionTimeoutConst.switchConnectionCrons
    });
    openStNotification.subscribeEvent
      .rabbit(
        ['block_scanner_execute_' + oThis.chainId],
        {
          queue: 'block_scanner_execute_' + oThis.chainId,
          ackRequired: 1,
          prefetch: oThis.prefetchCount
        },
        function(params) {
          // Promise is required to be returned to manually ack messages in RMQ
          return oThis.PromiseQueueManager.createPromise(params);
        },
        function(consumerTag) {
          oThis.consumerTag = consumerTag;
        }
      )
      .catch(function(error) {
        logger.error('Error in subscription', error);
        ostRmqError();
      });
  }

  /**
   * This method calls the transaction parser and token transfer parser services as needed.
   *
   * @param {String} params
   *
   * @returns {Promise<*>}
   */
  async transactionParserExecutor(params) {
    unAckCount++;

    const oThis = this;

    // Process request
    const parsedParams = JSON.parse(params),
      payload = parsedParams.message.payload;

    // Fetch params from payload.
    const chainId = payload.chainId.toString(),
      blockHash = payload.blockHash,
      transactionHashes = payload.transactionHashes,
      blockNumber = payload.blockNumber,
      nodes = payload.nodes;

    const blockValidationResponse = await oThis._verifyBlockNumberAndBlockHash(blockNumber, blockHash, nodes),
      blockVerified = blockValidationResponse.blockVerified,
      rawBlock = blockValidationResponse.rawBlock;

    // Block hash of block number passed and block hash received from params don't match.
    if (!blockVerified) {
      logger.error('Hash of block number: ', blockNumber, ' does not match the blockHash: ', blockHash, '.');
      // logger.notify(); TODO: Add this.
      logger.debug('------unAckCount -> ', unAckCount);
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

          if (tokenTransferParserResponse.isSuccess()) {
            // Token transfer parser was successful.
            // TODO: Add dirty balances entry in MySQL.
            // TODO: Chainable
            logger.debug('------unAckCount -> ', unAckCount);
            // ACK RMQ.
            return Promise.resolve();
          } else {
            // If token transfer parsing failed.

            logger.error(
              'e_bs_w_3',
              'Token transfer parsing unsuccessful. unAckCount ->',
              unAckCount,
              'Token transfer parsing response: ',
              tokenTransferParserResponse
            );
            // ACK RMQ.
            return Promise.resolve();
          }
        } else {
          // If token transfer parsing not needed.

          logger.log('Token transfer parsing not needed.');
          logger.debug('------unAckCount -> ', unAckCount);
          // ACK RMQ.
          return Promise.resolve();
        }
      } else {
        // Transaction parsing response was unsuccessful.

        logger.error(
          'e_bs_w_4',
          'Error in transaction parsing. unAckCount ->',
          unAckCount,
          'Transaction parsing response: ',
          transactionParserResponse
        );
        // ACK RMQ.
        return Promise.resolve();
      }
    }
  }

  /**
   * This method executes the promises.
   *
   * @param onResolve
   * @param onReject
   * @param {String} params
   *
   * @returns {*}
   *
   * @private
   */
  _promiseExecutor(onResolve, onReject, params) {
    const oThis = this;

    oThis
      .transactionParserExecutor(params)
      .then(function() {
        unAckCount--;
        onResolve();
      })
      .catch(function(error) {
        unAckCount--;
        logger.error(
          'e_bs_w_5',
          'Error in token transfer parsing. unAckCount ->',
          unAckCount,
          'Error: ',
          error,
          'Params: ',
          params
        );
        onResolve();
      });
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

  /**
   * This function checks if there are any pending tasks left or not.
   *
   * @returns {Boolean}
   */
  pendingTasksDone() {
    const oThis = this;

    if (unAckCount !== oThis.PromiseQueueManager.getPendingCount()) {
      logger.error('ERROR :: unAckCount and pending counts are not in sync.');
    }
    return !oThis.PromiseQueueManager.getPendingCount() && !unAckCount;
  }
}

// Check whether the cron can be started or not.
cronProcessHandler
  .canStartProcess({
    id: +program.cronProcessId, // Implicit string to int conversion.
    cronKind: cronKind
  })
  .then(function(dbResponse) {
    let cronParams, blockScannerWorkerObj;

    try {
      // Fetch params from the DB.
      cronParams = JSON.parse(dbResponse.data.params);
      chainId = +cronParams.chainId;
      prefetchCount = +cronParams.prefetchCount;

      const params = {
        chainId: chainId,
        prefetchCount: prefetchCount
      };

      // We are creating the object before validation since we need to attach the methods of SigInt handler to the
      // prototype of this class.
      blockScannerWorkerObj = new BlockScannerWorker(params);
    } catch (err) {
      logger.error('cronParams stored in INVALID format in the DB.');
      logger.error(
        'The status of the cron was NOT changed to stopped. Please check the status before restarting the cron'
      );
      logger.error('Error: ', err);
      process.exit(1);
    }

    // Perform action if cron can be started.
    blockScannerWorkerObj.perform().then(function() {
      logger.win('Block scanner worker process promise received.');
    });
  });

function ostRmqError(err) {
  logger.info('ostRmqError occurred.', err);
  process.emit('SIGINT');
}

cronProcessHandler.endAfterTime({ timeInMinutes: 45 });
