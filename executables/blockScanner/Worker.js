'use strict';
/**
 * This code acts as a worker process for block scanner, which takes the transactions from delegator
 * and processes them.
 *
 * Usage: node executables/blockScanner/Worker.js processLockId
 *
 * Command Line Parameters Description:
 * processLockId: used for ensuring that no other process with the same processLockId can run on a given machine.
 *
 * @module executables/blockScanner/Worker.
 */
const OSTBase = require('@openstfoundation/openst-base');

const rootPrefix = '../..',
  InstanceComposer = OSTBase.InstanceComposer,
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
  connectionTimeoutConst = require(rootPrefix + '/lib/globalConstant/connectionTimeout'),
  CronProcessHandlerObject = new CronProcessesHandler();

/**
 * This function demonstrates how to use the block scanner worker cron.
 */
const usageDemo = function() {
  logger.log('Usage:', 'node executables/blockScanner/Worker.js processLockId');
  logger.log(
    '* processLockId is used for ensuring that no other process with the same processLockId can run on a given machine.'
  );
};

// Declare variables.
const args = process.argv,
  processLockId = args[2];

// Validate if processLockId was passed or not.
if (!processLockId) {
  logger.error('Process Lock id NOT passed in the arguments.');
  usageDemo();
  process.exit(1);
}

const cronKind = cronProcessesConstants.blockScannerWorker;

let unAckCount = 0,
  chainId,
  prefetchCount;

/**
 * Class for block scanner worker
 *
 * @class
 */
class BlockScanner extends SigIntHandler {
  /**
   * Constructor for block scanner worker
   *
   * @augments SigIntHandler
   *
   * @param {Object} params
   * @param {Number} params.chainId
   * @param {Number} params.prefetchCount
   *
   * @constructor
   */
  constructor(params) {
    super({
      id: processLockId
    });

    const oThis = this;

    oThis.chainId = params.chainId;
    oThis.prefetchCount = params.prefetchCount;
  }

  /**
   * Main performer method for the class.
   *
   * @returns {Promise<>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(err) {
      // If asyncPerform fails, run the below catch block.
      oThis.canExit = true;
      logger.error(' In catch block of executables/blockScanner/Worker.js');
      return responseHelper.error({
        internal_error_identifier: 'e_bs_w_1',
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
    oThis.validateAndSanitize();

    // Warm up web3 pool. TODO: Complete this method.
    await oThis.warmUpWeb3Pool();

    // Initialize certain variables.
    await oThis.init();

    // Initialize certain variables.
    await oThis.startSubscription();
  }

  /**
   * Sanitizes and validates the input parameters.
   */
  validateAndSanitize() {
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

    const configStrategy = configStrategyResp.data;
    oThis.ic = new InstanceComposer(configStrategy);

    let web3PoolSize = coreConstants.OST_WEB3_POOL_SIZE,
      wsProviders = configStrategy.auxGeth.readOnly.wsProviders;

    logger.log('====Warming up geth pool for providers====', wsProviders);

    for (let index = 0; index < configStrategy.wsProviders.length; index++) {
      let provider = configStrategy.wsProviders[index];
      for (let i = 0; i < web3PoolSize; i++) {
        web3InteractFactory.getInstance(provider);
      }
    }
  }

  /**
   * Initializes Promise queue manager, transaction parser service and transfer
   * parser service.
   */
  async init() {
    const oThis = this;

    // Initialize PromiseQueueManager.
    oThis.PromiseQueueManager = new OSTBase.OSTPromise.QueueManager(oThis._promiseExecutor, {
      name: 'blockscanner_promise_queue_manager',
      timeoutInMilliSecs: 3 * 60 * 1000, //3 minutes
      maxZombieCount: Math.round(oThis.prefetchCount * 0.25),
      onMaxZombieCountReached: function() {
        logger.warn('e_bs_w_2', 'maxZombieCount reached. Triggering SIGTERM.');
        // Trigger gracefully shutdown of process.
        process.emit('SIGTERM'); // TODO: Get this verified.
      }
    });

    // Get blockScanner object.
    oThis.blockScannerObj = await blockScannerProvider.getInstance([oThis.chainId]);

    oThis.TransactionParser = oThis.blockScannerObj.transaction.Parser;
    oThis.TokenTransferParser = oThis.blockScannerObj.transfer.Parser;

    return Promise.resolve();
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
   * This method executes the promises.
   *
   * @param onResolve
   * @param onReject
   * @param {Object} params
   *
   * @returns {*}
   *
   * @private
   */
  _promiseExecutor(onResolve, onReject, params) {
    unAckCount++;

    let payload;
    const oThis = this;

    // Trying because of JSON.parse.
    try {
      // Process request
      const parsedParams = JSON.parse(params);
      payload = parsedParams.message.payload;
    } catch (error) {
      unAckCount--;
      logger.error(
        'e_bs_w_3',
        'Error in parsing the message. unAckCount ->',
        unAckCount,
        'Error: ',
        error,
        'Params: ',
        params
      );
      // ACK RMQ
      return onResolve();
    }

    // Fetch params from payload.
    const chainId = payload.chainId,
      blockHash = payload.blockHash,
      transactionHashes = payload.transactionHashes,
      blockNumber = payload.blockNumber,
      nodes = payload.nodes;

    // Verify blockNumber and blockHash.
    oThis._verifyBlockNumberAndBlockHash(blockNumber, blockHash).then(function(response) {
      // Block hash of block number passed and block hash received from params don't match.
      if(!response) {

        logger.error('Hash of block number: ', blockNumber, ' does not match the blockHash: ', blockHash, '.');
        logger.notify(); // TODO: Add this.
        unAckCount--;
        logger.debug('------unAckCount -> ', unAckCount);
        // ACK RMQ.
        return onResolve();

      }
      // Block hash of block number passed and block hash received from params are the same.
      else {

        // Create object of transaction parser.
        let transactionParser = new oThis.TransactionParser(
          chainId,
          oThis.rawBlock,
          transactionHashes,
          nodes
        );

        // Start transaction parser service.
        transactionParser.perform().then(function(transactionParserResponse) {
          // If transaction parser was successful then only token transfer parser would work.
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
              new oThis.TokenTransferParser(chainId, oThis.rawBlock, processedReceipts, nodes)
                .perform()
                .then(function() {  // Token transfer parser was successful.
                  //TODO: Add dirty balances entry in MySQL.
                  //TODO: Chainable
                  unAckCount--;
                  logger.debug('------unAckCount -> ', unAckCount);
                  // ACK RMQ.
                  return onResolve();
                })
                .catch(function(error) {  // Catch of token transfer service performer.
                  unAckCount--;
                  logger.error(
                    'e_bs_w_4',
                    'Error in token transfer parsing. unAckCount ->',
                    unAckCount,
                    'Error: ',
                    error,
                    'Params: ',
                    params
                  );
                  // ACK RMQ.
                  return onResolve();
                });
            }
            // If token transfer parsing is not needed.
            else {
              unAckCount--;
              logger.log('Token transfer parsing not needed.');
              logger.debug('------unAckCount -> ', unAckCount);
              // ACK RMQ.
              return onResolve();
            }
          }
          // Transaction parsing response was unsuccessful.
          else {
            unAckCount--;
            logger.error(
              'e_bs_w_5',
              'Error in transaction parsing. unAckCount ->',
              unAckCount,
              'Transaction parsing response: ',
              transactionParserResponse
              );
            // ACK RMQ.
            return onResolve();
          }
        })
          .catch(function(error) {  // Catch of transaction parser service performer.
            unAckCount--;
            logger.error('e_bs_w_6',
              'Error while executing transaction parser service. unAckCount -> ',
              unAckCount,
              'Error: ',
              error
            );
            // ACK RMQ
            return onResolve();
        })
      }
    })
      .catch(function(error) {  // Catch of _verifyBlockNumberAndBlockHash method.
      unAckCount--;
      logger.error('e_bs_w_7', 'Error while fetching block. unAckCount -> ', unAckCount, 'Error: ', error);
      // ACK RMQ
      return onResolve();
    });

  }

  /**
   * This method verifies the blockHash received with the actual blockHash of
   * the passed blockNumber
   *
   * @param {Number} blockNumber
   * @param {String} blockHash
   * @returns {Promise<Boolean>}
   *
   * @private
   */
  async _verifyBlockNumberAndBlockHash(blockNumber, blockHash) {
    const oThis = this;

    oThis.rawBlock  = await web3InteractFactory.getBlock(blockNumber);

    const correctBlockHash = oThis.rawBlock.hash;

    if (correctBlockHash === blockHash) {
      return Promise.resolve(true);
    }
    else {
      return Promise.resolve(false);
    }
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
CronProcessHandlerObject.canStartProcess({
  id: +processLockId, // Implicit string to int conversion.
  cronKind: cronKind
}).then(function(dbResponse) {
  let cronParams;

  try {
    // Fetch params from the DB.
    cronParams = JSON.parse(dbResponse.data.params);
    chainId = +cronParams.chainId;
    prefetchCount = +cronParams.prefetchCount;

    const params = {
      chainId: chainId,
      prefetchCount: prefetchCount
    };

    const blockScanner = new BlockScanner(params);
    blockScanner.perform().catch(function(err) {
      logger.error(err);
    });
  } catch (err) {
    logger.error('cronParams stored in INVALID format in the DB.');
    logger.error(
      'The status of the cron was NOT changed to stopped. Please check the status before restarting the cron'
    );
    process.exit(1);
  }
});

function ostRmqError(err) {
  logger.info('ostRmqError occurred.', err);
  process.emit('SIGINT');
}

CronProcessHandlerObject.endAfterTime({ time_in_minutes: 45 });
