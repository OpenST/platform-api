'use strict';
/**
 * This code publishes blocks which are finalized so that aggregation can start
 *
 * Usage: node executables/blockScanner/finalizer.js --cronProcessId <cronProcessId>
 *
 * Command Line Parameters Description:
 * cronProcessId: used for ensuring that no other process with the same cronProcessId can run on a given machine.
 *
 * @module executables/blockScanner/finalizer
 */
const rootPrefix = '../..',
  program = require('commander'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  rabbitmqProvider = require(rootPrefix + '/lib/providers/rabbitmq'),
  rabbitmqConstant = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  connectionTimeoutConst = require(rootPrefix + '/lib/globalConstant/connectionTimeout'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  PublisherBase = require(rootPrefix + '/executables/rabbitmq/PublisherBase'),
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  TxFinalizeDelegator = require(rootPrefix + '/lib/transactions/finalizer/Delegator'),
  PostTxFinalizeSteps = require(rootPrefix + '/lib/transactions/PostTransactionFinalizeSteps'),
  BlockParserPendingTask = require(rootPrefix + '/app/models/mysql/BlockParserPendingTask');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/blockScanner/finalizer.js --cronProcessId 1');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

/**
 * Class for Finalizer
 *
 * @class
 */
class Finalizer extends PublisherBase {
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

    const oThis = this;

    oThis.canExit = true; // Denotes whether process can exit or not.
  }

  async _start() {
    const oThis = this;

    // Validate whether chainId exists in the chains table.
    await oThis._validateChainId();

    await oThis._startFinalizer();
  }

  /**
   * Sanitizes and validates the input parameters. ChainId is not validated here as it is already validated
   * before calling the perform method of the class.
   *
   * @private
   */
  _specificValidations() {
    const oThis = this;

    // Validate chainId
    if (!oThis.chainId) {
      logger.error('Invalid chainId. Exiting the cron.');
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

    // Its an origin chain
    oThis.isOriginChain = configStrategy[configStrategyConstants.originGeth].chainId == oThis.chainId;

    // Get blockScanner object.
    const blockScannerObj = await blockScannerProvider.getInstance([oThis.chainId]);

    // Get block delay
    oThis.blockDelay = blockScannerProvider.getFinalizeAfterBlockFor(oThis.chainId);

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
   * Initializes block parser service and blockToProcess.
   *
   * @param {Object} blockScannerObj
   *
   * @private
   */
  _init(blockScannerObj) {
    const oThis = this;

    // Initialize BlockParser.
    oThis.BlockScannerFinalizer = blockScannerObj.block.Finalize;
    oThis.chainCronDataModel = blockScannerObj.model.ChainCronData;
    oThis.PendingTransactionByHashCache = blockScannerObj.cache.PendingTransactionByHash;
    oThis.PendingTransactionByUuidCache = blockScannerObj.cache.PendingTransactionByUuid;

    logger.step('Services initialised.');
  }

  /**
   *
   * @return {*[]}
   * @private
   */
  async _startFinalizer() {
    const oThis = this;

    if (!oThis.isOriginChain) {
      oThis.ostNotification = await rabbitmqProvider.getInstance(rabbitmqConstant.auxRabbitmqKind, {
        auxChainId: oThis.chainId,
        connectionWaitSeconds: connectionTimeoutConst.crons,
        switchConnectionWaitSeconds: connectionTimeoutConst.switchConnectionCrons
      });
    }

    let waitTime = 0;
    while (true) {
      // SIGINT Received
      if (oThis.stopPickingUpNewWork) {
        break;
      }

      oThis.canExit = false;
      if (waitTime > 2 * 30 * 5) {
        logger.notify('finalizer_stuck', 'Finalizer is stuck for more than 5 minutes for chainId: ', +oThis.chainId);
      }

      let finalizer = new oThis.BlockScannerFinalizer({
        chainId: oThis.chainId,
        blockDelay: oThis.blockDelay
      });

      let blockToProcess = await finalizer.getBlockToFinalize();

      let pendingTasks = await new BlockParserPendingTask().pendingBlockTasks(oThis.chainId, blockToProcess);
      if (pendingTasks.length > 0) {
        logger.log('=== Transactions not yet completely parsed for block: ', blockToProcess);
        logger.log('=== Waiting for 2 secs');
        waitTime += 2;
        await oThis.sleep(2000);
      } else {
        waitTime = 0;
        let validationResponse = await finalizer.validateBlockToProcess(blockToProcess);
        if (validationResponse.isSuccess() && validationResponse.data.blockProcessable) {
          // Intersect pending transactions for Origin chain
          finalizer.currentBlockInfo.transactions = await oThis._filterOutUsingPendingTransaction(
            finalizer.currentBlockInfo.transactions
          );
          let finalizerResponse = await finalizer.finalizeBlock();
          if (finalizerResponse.isFailure()) {
            logger.log('=== Finalization failed for block: ', blockToProcess);
            logger.log('=== Waiting for 2 secs');
            await oThis.sleep(2000);
          } else {
            if (finalizerResponse.data.processedBlock) {
              let processedTransactionHashes = finalizerResponse.data.processedTransactions,
                processedBlockNumber = finalizerResponse.data.processedBlock;

              if (processedTransactionHashes.length > 0) {
                if (oThis.isOriginChain) {
                  let postTxFinalizeSteps = new PostTxFinalizeSteps({
                    chainId: oThis.chainId,
                    blockNumber: processedBlockNumber,
                    transactionHashes: processedTransactionHashes
                  });

                  await postTxFinalizeSteps.perform();
                } else {
                  let txFinalizeDelegator = new TxFinalizeDelegator({
                    auxChainId: oThis.chainId,
                    blockNumber: processedBlockNumber,
                    transactionHashes: processedTransactionHashes
                  });

                  let txFinalizeDelegatorRsp = await txFinalizeDelegator.perform();

                  if (txFinalizeDelegatorRsp.isFailure()) {
                    return Promise.reject(txFinalizeDelegatorRsp);
                  }

                  logger.info('===== Processed block', finalizerResponse.data.processedBlock, '=======');
                }
              }

              await oThis._updateLastProcessedBlock(processedBlockNumber);

              logger.info('===== Processed block', processedBlockNumber, '=======');

              if (!oThis.isOriginChain) {
                await oThis._publishBlock(processedBlockNumber);
              }
            }

            logger.log('===Waiting for 10 milli-secs');
            await oThis.sleep(10);
          }
        } else {
          logger.log('=== Block not processable yet. ');
          logger.log('=== Waiting for 2 secs');
          await oThis.sleep(2000);
        }
      }

      oThis.canExit = true;
    }
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

  /**
   * updateLastProcessedBlock
   *
   * @return {Promise<void>}
   */
  async _updateLastProcessedBlock(blockNumber) {
    const oThis = this;

    let chainCronDataObj = new oThis.chainCronDataModel({});

    let updateParams = {
      chainId: oThis.chainId,
      lastFinalizedBlock: blockNumber
    };

    return chainCronDataObj.updateItem(updateParams);
  }

  /**
   * _publishBlock
   *
   * @param blockNumber
   * @return {Promise<void>}
   * @private
   */
  async _publishBlock(blockNumber) {
    const oThis = this;

    let messageParams = {
      topics: oThis._topicsToPublish,
      publisher: oThis._publisher,
      message: {
        kind: oThis._messageKind,
        payload: {
          chainId: oThis.chainId,
          blockNumber: blockNumber
        }
      }
    };

    let setToRMQ = await oThis.ostNotification.publishEvent.perform(messageParams);

    // If could not set to RMQ run in async.
    if (setToRMQ.isFailure() || setToRMQ.data.publishedToRmq === 0) {
      logger.error("====Couldn't publish the message to RMQ====");
      return Promise.reject({ err: "Couldn't publish block number" + blockNumber });
    }
    logger.log('====published block', blockNumber);
  }

  /**
   * _topicsToPublish
   *
   * @return {*[]}
   * @private
   */
  get _topicsToPublish() {
    const oThis = this;

    return ['aggregator_' + oThis.chainId];
  }

  get _publisher() {
    const oThis = this;

    return 'OST';
  }

  get _messageKind() {
    const oThis = this;

    return 'background_job';
  }

  get _cronKind() {
    return cronProcessesConstants.blockFinalizer;
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
}

logger.step('Block finalizer process started.');

new Finalizer({ cronProcessId: +program.cronProcessId }).perform();

setInterval(function() {
  logger.info('Ending the process. Sending SIGINT.');
  process.emit('SIGINT');
}, 30 * 60 * 1000);
