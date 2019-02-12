'use strict';
/**
 * This code publishes blocks which are finalized so that aggregation can start
 *
 * Usage: node executables/blockScanner/Finalizer.js --cronProcessId <cronProcessId>
 *
 * Command Line Parameters Description:
 * cronProcessId: used for ensuring that no other process with the same cronProcessId can run on a given machine.
 *
 * @module executables/blockScanner/Finalizer
 */
const rootPrefix = '../..',
  program = require('commander'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  PublisherBase = require(rootPrefix + '/executables/rabbitmq/PublisherBase'),
  rabbitMqProvider = require(rootPrefix + '/lib/providers/notification'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  connectionTimeoutConst = require(rootPrefix + '/lib/globalConstant/connectionTimeout'),
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  BlockParserPendingTask = require(rootPrefix + '/app/models/mysql/BlockParserPendingTask');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/blockScanner/Finalizer.js --cronProcessId 1');
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

    // Validate blockDelay
    if (!oThis.blockDelay) {
      logger.error('Invalid blockDelay. Exiting the cron.');
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
    oThis.PendingTransactionModel = blockScannerObj.model.PendingTransaction;

    logger.step('Services initialised.');
  }

  /**
   *
   * @return {*[]}
   * @private
   */
  async _startFinalizer() {
    const oThis = this;

    oThis.openSTNotification = await rabbitMqProvider.getInstance({
      connectionWaitSeconds: connectionTimeoutConst.crons,
      switchConnectionWaitSeconds: connectionTimeoutConst.switchConnectionCrons
    });

    let waitTime = 0;
    while (true) {
      // SIGINT Received
      if (oThis.stopPickingUpNewWork) {
        break;
      }

      oThis.canExit = false;
      oThis.dataToDelete = [];
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
          finalizer.currentBlockInfo.transactions = await oThis._intersectPendingTransactions(
            finalizer.currentBlockInfo.transactions
          );
          let finalizerResponse = await finalizer.finalizeBlock();
          if (finalizerResponse.isFailure()) {
            logger.log('=== Finalization failed for block: ', blockToProcess);
            logger.log('=== Waiting for 2 secs');
            await oThis.sleep(2000);
          } else {
            if (finalizerResponse.data.processedBlock) {
              await oThis._checkAfterReceiptTasksAndPublish(finalizerResponse.data);

              await oThis._cleanupPendingTransactions();

              await oThis._updateLastProcessedBlock(finalizerResponse.data.processedBlock);

              logger.info('===== Processed block', finalizerResponse.data.processedBlock, '=======');

              await oThis._publishBlock(finalizerResponse.data.processedBlock);
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

    let setToRMQ = await oThis.openSTNotification.publishEvent.perform(messageParams);

    // If could not set to RMQ run in async.
    if (setToRMQ.isFailure() || setToRMQ.data.publishedToRmq === 0) {
      logger.error("====Couldn't publish the message to RMQ====");
      return Promise.reject({ err: "Couldn't publish block number" + blockNumber });
    }
    logger.log('====published block', blockNumber);
  }

  /**
   * _checkAfterReceiptTasksAndPublish
   *
   * @return {Promise<void>}
   * @private
   */
  async _checkAfterReceiptTasksAndPublish(params) {
    const oThis = this,
      pendingTransactionModel = new oThis.PendingTransactionModel({
        chainId: oThis.chainId
      });

    let transactionHashes = params.processedTransactions;

    if (transactionHashes.length <= 0) return;

    oThis.dataToDelete = [];
    let promises = [];
    while (true) {
      let batchedTransactionHashes = transactionHashes.splice(0, 50);
      if (batchedTransactionHashes.length <= 0) {
        break;
      }

      let pendingTransactionRsp = await pendingTransactionModel.getPendingTransactionsWithHashes(
          oThis.chainId,
          batchedTransactionHashes
        ),
        pendingTransactionsMap = pendingTransactionRsp.data,
        batchGetParams = [];

      for (let txHash in pendingTransactionsMap) {
        let txData = pendingTransactionsMap[txHash];
        batchGetParams.push(txData);
      }
      if (batchGetParams.length <= 0) {
        continue;
      }
      let ptxResp = await pendingTransactionModel.getPendingTransactionData(batchGetParams);
      if (ptxResp.isFailure()) {
        continue;
      }
      let pendingTransactionData = ptxResp.data;
      for (let txHash in pendingTransactionData) {
        let ptd = pendingTransactionData[txHash];
        oThis.dataToDelete.push(ptd);

        if (ptd.hasOwnProperty('afterReceipt')) {
          // Publish state root info for workflow to be able to proceed with other steps
          let publishPromise = new Promise(function(onResolve, onReject) {
            oThis
              ._publishAfterReceiptInfo(ptd.afterReceipt)
              .then(function(resp) {
                onResolve();
              })
              .catch(function(err) {
                logger.error('Could not publish transaction after receipt: ', err);
                onResolve();
              });
          });
          promises.push(publishPromise);
        }
      }
    }

    return Promise.all(promises);
  }

  /**
   * _cleanupPendingTransactions
   *
   * @return {Promise<void>}
   */
  async _cleanupPendingTransactions() {
    const oThis = this,
      pendingTransactionModel = new oThis.PendingTransactionModel({
        chainId: oThis.chainId
      });

    if (oThis.dataToDelete.length > 0) {
      await pendingTransactionModel.batchDeleteItem(oThis.dataToDelete, coreConstants.batchDeleteRetryCount);
    }
  }

  /**
   * _publishAfterReceiptInfo
   *
   * @param publishParams - Params to publish message
   * @return {Promise<never>}
   * @private
   */
  async _publishAfterReceiptInfo(publishParams) {
    const oThis = this;

    if (!publishParams || publishParams == '') {
      return;
    }

    let messageParams = JSON.parse(publishParams);

    let setToRMQ = await oThis.openSTNotification.publishEvent.perform(messageParams);

    // If could not set to RMQ run in async.
    if (setToRMQ.isFailure() || setToRMQ.data.publishedToRmq === 0) {
      logger.error("====Couldn't publish the message to RMQ====");
      return Promise.reject({ err: "Couldn't publish transaction pending for publish: " + publishParams });
    }

    logger.info('==== Pending transaction published ===');
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
   * This method intersect block transactions with Pending transactions for Origin chain.
   *
   * @param {Array} blockTransactions
   *
   * @returns {Promise<Array>}
   */
  async _intersectPendingTransactions(blockTransactions) {
    const oThis = this;

    // In case of origin chain add transactions only if they are present in Pending transactions.
    if (oThis.isOriginChain) {
      let pendingTransactionModel = new oThis.PendingTransactionModel({
          chainId: oThis.chainId
        }),
        transactionHashes = blockTransactions,
        intersectData = [];
      while (true) {
        let batchedTransactionHashes = transactionHashes.splice(0, 50);
        if (batchedTransactionHashes.length <= 0) {
          break;
        }
        let pendingTransactionRsp = await pendingTransactionModel.getPendingTransactionsWithHashes(
            oThis.chainId,
            batchedTransactionHashes
          ),
          pendingTransactionsMap = pendingTransactionRsp.data;

        for (let txHash in pendingTransactionsMap) {
          intersectData.push(txHash);
        }
      }
      return Promise.resolve(intersectData);
    } else {
      return Promise.resolve(blockTransactions);
    }
  }
}

logger.step('Block finalizer process started.');

new Finalizer({ cronProcessId: +program.cronProcessId }).perform();
