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
const program = require('commander');

const rootPrefix = '../..',
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  ErrorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  PublisherBase = require(rootPrefix + '/executables/rabbitmq/PublisherBase'),
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  TxFinalizeDelegator = require(rootPrefix + '/lib/transactions/finalizer/Delegator'),
  BlockParserPendingTask = require(rootPrefix + '/app/models/mysql/BlockParserPendingTask'),
  PostTxFinalizeSteps = require(rootPrefix + '/lib/transactions/PostTransactionFinalizeSteps'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  rabbitmqProvider = require(rootPrefix + '/lib/providers/rabbitmq'),
  rabbitmqConstant = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  PostTransactionMinedSteps = require(rootPrefix + '/lib/transactions/PostTransactionMinedSteps'),
  connectionTimeoutConst = require(rootPrefix + '/lib/globalConstant/connectionTimeout');

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
 * Class for Finalizer.
 *
 * @class Finalizer
 */
class Finalizer extends PublisherBase {
  /**
   * Constructor for transaction parser
   *
   * @param {Object} params: params object
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

    if(oThis.isOriginChain && coreConstants.SA_ORIGIN_NETWORK_UPGRADE){
      logger.step('Cron execution terminated due to Origin Network Update.');
      return;
    }

    await oThis._startFinalizer();
  }

  /**
   * Sepcific validations
   *
   * @return {Promise<never>}
   * @private
   */
  async _specificValidations() {
    const oThis = this;

    // Validate chainId
    if (!oThis.chainId) {
      let errMsg = 'Invalid chainId. Exiting the cron.';

      logger.error(errMsg);
      return Promise.reject(errMsg);
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
      chainExists = await new ChainModel({}).checkIfChainIdExists(oThis.chainId),
      chainIdBooleanValidation = CommonValidators.validateBoolean(chainExists);

    // If response from checkIfChainIdExists is not a boolean, that means error object is returned.
    if (!chainIdBooleanValidation) {
      const errorObject = responseHelper.error({
        internal_error_identifier: 'something_went_wrong:e_bs_f_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: {}
      });

      await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);

      process.emit('SIGINT');
    }

    // If response from checkIfChainIdExists is true or false, we make further checks.
    if (!chainExists) {
      logger.error('ChainId does not exist in the chains table.');

      const errorObject = responseHelper.error({
        internal_error_identifier: 'invalid_chain_id:e_bs_f_2',
        api_error_identifier: 'invalid_chain_id',
        debug_options: {}
      });

      await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);

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

    logger.step('Services initialised.');
  }

  /**
   * Start finalizer.
   *
   * @return {*[]}
   *
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
      // SIGINT received.
      if (oThis.stopPickingUpNewWork) {
        oThis.canExit = true;
        break;
      }

      oThis.canExit = false;

      const finalizer = new oThis.BlockScannerFinalizer({
        chainId: oThis.chainId,
        blockDelay: oThis.blockDelay
      });

      const blockToProcess = await finalizer.getBlockToFinalize();

      if (waitTime > 2 * 30 * 5) {
        // 5 minutes.
        const errorObject = responseHelper.error({
          internal_error_identifier: 'finalizer_stuck:e_bs_f_3',
          api_error_identifier: 'finalizer_stuck',
          debug_options: { waitTime: waitTime, chainId: oThis.chainId, blockStuck: blockToProcess }
        });

        await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.mediumSeverity);
      }

      const pendingTasks = await new BlockParserPendingTask().pendingBlockTasks(oThis.chainId, blockToProcess);
      if (pendingTasks.length > 0) {
        logger.log('=== Transactions not yet completely parsed for block: ', blockToProcess);
        logger.log('=== Waiting for 2 secs');
        waitTime += 2;
        await basicHelper.sleep(2000);
      } else if (waitTime > 2) {
        logger.log(
          '=== Transactions of block ',
          blockToProcess,
          ' are just processed, so sleeping before proceeding further.'
        );
        logger.log('=== Waiting for 10 secs');
        await basicHelper.sleep(10000);
        waitTime = 0;
      } else {
        waitTime = 0;
        const validationResponse = await finalizer.validateBlockToProcess(blockToProcess);
        if (validationResponse.isSuccess() && validationResponse.data.blockProcessable) {
          // Intersect pending transactions for Origin chain
          finalizer.currentBlockInfo.transactions = await oThis._filterOutUsingPendingTransaction(
            finalizer.currentBlockInfo.transactions
          );
          const finalizerResponse = await finalizer.finalizeBlock();
          if (finalizerResponse.isFailure()) {
            logger.log('=== Finalization failed for block: ', blockToProcess);
            logger.log('=== Waiting for 2 secs');
            const errorObject = responseHelper.error({
              internal_error_identifier: 'finalization_failed_for_block:e_bs_f_4',
              api_error_identifier: 'finalization_failed_for_block',
              debug_options: { finalizerResponse: finalizerResponse }
            });

            await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.mediumSeverity);
            await basicHelper.sleep(2000);
          } else {
            await oThis._onFinalizeSuccess(finalizerResponse);

            logger.log('===Waiting for 10 milli-secs');
            await basicHelper.sleep(10);
          }
        } else {
          logger.log('=== Block not processable yet. ');
          logger.log('=== Waiting for 2 secs');
          await basicHelper.sleep(2000);
        }
      }

      oThis.canExit = true;
    }
  }

  /**
   * Update last processed block.
   *
   * @return {Promise<void>}
   */
  async _updateLastProcessedBlock(blockNumber) {
    const oThis = this;

    const chainCronDataObj = new oThis.chainCronDataModel({});

    const updateParams = {
      chainId: oThis.chainId,
      lastFinalizedBlock: blockNumber
    };

    return chainCronDataObj.updateItem(updateParams);
  }

  /**
   * Things to do after finalizer success
   *
   * @param finalizerResponse
   * @returns {Promise<void>}
   * @private
   */
  async _onFinalizeSuccess(finalizerResponse){
    const oThis = this,
      finalizerResponseData = finalizerResponse.data;

    if (finalizerResponseData.processedBlock) {
      const processedTransactionHashes = finalizerResponseData.processedTransactions,
        processedBlockNumber = finalizerResponseData.processedBlock;

      if (processedTransactionHashes.length > 0) {
        // If block is reprocessed then redo things, which needs to be done after transaction is mined
        if(finalizerResponseData.blockReProcessed){
          let postTrxMinedObj = new PostTransactionMinedSteps({chainId: oThis.chainId,
            transactionHashes: processedTransactionHashes,
            transactionReceiptMap: finalizerResponseData.processedTransactionsReceipts});

          await postTrxMinedObj.perform().catch(function(error) {
            // If transaction is not mined properly from here, then balance settler would be blocked for it.
            logger.error('PostTransactionMinedSteps failed in finalizer.', error);
          });
        }

        if (oThis.isOriginChain) {
          await new PostTxFinalizeSteps({
            chainId: oThis.chainId, blockNumber: processedBlockNumber,
            transactionHashes: processedTransactionHashes
          }).perform();
        } else {
          await oThis._delegateTaskAfterBlockProcessed(processedBlockNumber, processedTransactionHashes);
        }
      }

      await oThis._updateLastProcessedBlock(processedBlockNumber);

      logger.info('===== Processed block', processedBlockNumber, '=======');

      if (!oThis.isOriginChain) {
        await oThis._publishBlock(processedBlockNumber);
      }
    }
  }

  /**
   * Delegate task after block processed.
   *
   * @param processedBlockNumber
   * @param processedTransactionHashes
   * @returns {Promise<never>}
   * @private
   */
  async _delegateTaskAfterBlockProcessed(processedBlockNumber, processedTransactionHashes){
    const oThis = this;

    const txFinalizeDelegator = new TxFinalizeDelegator({
      auxChainId: oThis.chainId,
      blockNumber: processedBlockNumber,
      transactionHashes: processedTransactionHashes
    });

    const txFinalizeDelegatorRsp = await txFinalizeDelegator.perform();

    if (txFinalizeDelegatorRsp.isFailure()) {
      return Promise.reject(txFinalizeDelegatorRsp);
    }
  }

  /**
   * Publish block for further processing.
   *
   * @param {String/Number} blockNumber
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _publishBlock(blockNumber) {
    const oThis = this;

    const messageParams = {
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

    const setToRMQ = await oThis.ostNotification.publishEvent.perform(messageParams);

    // If could not set to RMQ run in async.
    if (setToRMQ.isFailure() || setToRMQ.data.publishedToRmq === 0) {
      logger.error("====Couldn't publish the message to RMQ====");

      return Promise.reject({ err: "Couldn't publish block number" + blockNumber });
    }
    logger.log('====published block', blockNumber);
  }

  /**
   * Topics to publish.
   *
   * @return {*[]}
   *
   * @private
   */
  get _topicsToPublish() {
    const oThis = this;

    return ['aggregator_' + oThis.chainId];
  }

  /**
   * Publisher.
   *
   * @return {String}
   *
   * @private
   */
  get _publisher() {
    return 'OST';
  }

  /**
   * Message kind.
   *
   * @return {String}
   *
   * @private
   */
  get _messageKind() {
    return 'background_job';
  }

  /**
   * Cron kind
   *
   * @return {String}
   *
   * @private
   */
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
    if (!oThis.isOriginChain) {
      return blockTransactions;
    }

    const allTxHashes = blockTransactions,
      intersectedTxHashes = [];

    while (true) {
      const batchedTxHashes = allTxHashes.splice(0, 50);

      if (batchedTxHashes.length <= 0) {
        break;
      }

      const pendingTransactionRsp = await new oThis.PendingTransactionByHashCache({
        chainId: oThis.chainId,
        transactionHashes: batchedTxHashes
      }).fetch();

      for (const txHash in pendingTransactionRsp.data) {
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
}, cronProcessesConstants.continuousCronRestartInterval);
