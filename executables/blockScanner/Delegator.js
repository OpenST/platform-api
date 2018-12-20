'use strict';
/**
 * This code acts as a master process to block scanner, which delegates the transactions from a block to
 * block scanner worker processes.
 *
 * Usage: node executables/blockScanner/Delegator.js cronProcessId
 *
 * Command Line Parameters Description:
 * cronProcessId: used for ensuring that no other process with the same cronProcessId can run on a given machine.
 *
 * @module executables/blockScanner/Delegator
 */
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
  logger.log('    node executables/blockScanner/Delegator.js --cronProcessId 1');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

// Declare variables.
let chainId, endBlockNumber, startBlockNumber, intentionalBlockDelay;

const FAILURE_CODE = -1,
  MAX_TXS_PER_WORKER = 60,
  MIN_TXS_PER_WORKER = 10,
  cronKind = cronProcessesConstants.transactionDelegator;

/**
 * Class for Transaction Delegator
 *
 * @class
 */
class TransactionDelegator extends SigIntHandler {
  /**
   * Constructor for Transaction Delegator
   *
   * @augments SigIntHandler
   *
   * @param {Object} params
   * @param {Number} params.chainId
   * @param {Number} params.startBlockNumber
   * @param {Number} params.endBlockNumber
   * @param {Number} params.intentionalBlockDelay
   *
   * @constructor
   */
  constructor(params) {
    super({
      id: program.cronProcessId
    });

    const oThis = this;

    oThis.chainId = params.chainId;
    oThis.startBlockNumber = params.startBlockNumber || 0;
    oThis.endBlockNumber = params.endBlockNumber || 0;
    oThis.intentionalBlockDelay = params.intentionalBlockDelay || 0;

    oThis.canExit = true; // Denotes whether process can exit or not.

    oThis.attachHandlers(); // Attaching handlers from sigint handler.
  }

  /**
   * Main performer method for the class.
   *
   * @returns {Promise<>}
   */
  perform() {
    const oThis = this;

    logger.step('Block parser process started.');

    return oThis.asyncPerform().catch(function(err) {
      // If asyncPerform fails, run the below catch block.
      oThis.canExit = true;
      logger.error(' In catch block of executables/blockScanner/Delegator.js');
      return responseHelper.error({
        internal_error_identifier: 'e_bs_d_1',
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

    // Validate whether chainId exists in the chains table.
    await oThis.validateChainId();

    // Warm up web3 pool.
    await oThis.warmUpWeb3Pool();

    // Initialize certain variables.
    await oThis.init();

    // Parse blocks.
    await oThis.parseBlocks();
  }

  /**
   * Sanitizes and validates the input parameters. ChainId is not validated here as it is already validated
   * before calling the perform method of the class.
   */
  validateAndSanitize() {
    // Validate startBlockNumber.
    if (startBlockNumber === null || startBlockNumber === undefined) {
      logger.warn('startBlockNumber is unavailable. Block parser would select highest block available in the DB.');
    }
    if (startBlockNumber && startBlockNumber < 0) {
      logger.error('Invalid startBlockNumber. Exiting the cron.');
      process.emit('SIGINT');
    }

    // Validate endBlockNumber.
    if (endBlockNumber === null || endBlockNumber === undefined) {
      logger.warn('endBlockNumber is unavailable. Block parser would not stop automatically.');
    }
    if (endBlockNumber && endBlockNumber < 0) {
      logger.error('Invalid endBlockNumber. Exiting the cron.');
      process.emit('SIGINT');
    }

    // Validate intentionalBlockDelay
    if (intentionalBlockDelay < 0) {
      logger.error('Invalid intentionalBlockDelay. Exiting the cron.');
      process.emit('SIGINT');
    }

    logger.step('All validations done.');
  }

  /**
   * This method validates whether the chainId passed actually exists in the chains
   * table in DynamoDB or not.
   *
   * @returns {Promise<void>}
   */
  async validateChainId() {
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
    oThis.blockScannerObj = await blockScannerProvider.getInstance([oThis.chainId]);

    // Get ChainModel.
    const ChainModel = oThis.blockScannerObj.model.Chain,
      chainExists = await new ChainModel({}).checkIfChainIdExists(oThis.chainId);

    if (!chainExists) {
      logger.error('ChainId does not exist in the chains table.');
      process.emit('SIGINT');
    }

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
   */
  init() {
    const oThis = this;

    // Initialize BlockParser.
    oThis.BlockParser = oThis.blockScannerObj.block.Parser;

    // Initialize blockToProcess.
    if (oThis.startBlockNumber >= 0) {
      oThis.blockToProcess = oThis.startBlockNumber;
    } else {
      oThis.blockToProcess = 0;
    }
  }

  /**
   * This method parses the blocks.
   *
   * @returns {Promise<void>}
   */
  async parseBlocks() {
    const oThis = this;

    while (true) {
      if ((oThis.endBlockNumber && oThis.blockToProcess > oThis.endBlockNumber) || oThis.stopPickingUpNewWork) {
        oThis.canExit = true;
        break;
      }
      oThis.canExit = false;

      let blockParser = new oThis.BlockParser(oThis.chainId, {
          blockDelay: oThis.intentionalBlockDelay,
          blockToProcess: oThis.blockToProcess
        }),
        blockParserResponse = await blockParser.perform();

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
        topics: ['block_scanner_execute_' + oThis.chainId],
        publisher: 'OST',
        message: {
          kind: 'background_job',
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

  /**
   * This function checks if there are any pending tasks left or not.
   *
   * @returns {Boolean}
   */
  pendingTasksDone() {
    const oThis = this;

    return oThis.canExit;
  }

  /**
   * Sleep for particular time
   *
   * @param ms {Number}: time in ms
   *
   * @returns {Promise<any>}
   */
  sleep(ms) {
    return new Promise(function(resolve) {
      setTimeout(resolve, ms);
    });
  }
}

// Check whether the cron can be started or not.
cronProcessHandler
  .canStartProcess({
    id: +program.cronProcessId, // Implicit string to int conversion
    cronKind: cronKind
  })
  .then(function(dbResponse) {
    let cronParams, transactionDelegatorObj;

    try {
      // Fetch params from the DB.
      cronParams = JSON.parse(dbResponse.data.params);
      // Fetch and sanitize the params. Implicitly converting type from string to int.
      chainId = +cronParams.chainId;
      startBlockNumber = cronParams.startBlockNumber ? +cronParams.startBlockNumber : null;
      endBlockNumber = cronParams.endBlockNumber ? +cronParams.endBlockNumber : null;
      intentionalBlockDelay = cronParams.intentionalBlockDelay ? +cronParams.intentionalBlockDelay : 0;

      const params = {
        chainId: chainId,
        startBlockNumber: startBlockNumber,
        endBlockNumber: endBlockNumber,
        intentionalBlockDelay: intentionalBlockDelay
      };

      // We are creating the object before validation since we need to attach the methods of SigInt handler to the
      // prototype of this class.
      transactionDelegatorObj = new TransactionDelegator(params);

      // Validate if the chainId exists in the DB or not. We are not validating other parameters as they are
      // optional parameters.
      if (!chainId) {
        logger.error('Chain ID is un-available in cron params in the database.');
        process.emit('SIGINT');
      }
      if (chainId < 0) {
        // Implicit string to int conversion.
        logger.error('Chain ID is invalid.');
        process.emit('SIGINT');
      }
    } catch (err) {
      logger.error('Cron parameters stored in INVALID format in the DB.');
      logger.error(
        'The status of the cron was NOT changed to stopped. Please check the status before restarting the cron.'
      );
      logger.error('Error: ', err);
      process.exit(1);
    }

    // Perform action if cron can be started.
    transactionDelegatorObj.perform().then(function() {
      logger.win('Block parser process finished working.');
    });
  });
