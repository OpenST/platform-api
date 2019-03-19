'use strict';
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
  NonceForSession = require(rootPrefix + '/lib/nonce/get/ForSession'),
  ErrorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  TransactionMeta = require(rootPrefix + '/app/models/mysql/TransactionMeta'),
  RabbitmqSubscription = require(rootPrefix + '/lib/entity/RabbitSubscription'),
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  PendingTransactionCrud = require(rootPrefix + '/lib/transactions/PendingTransactionCrud'),
  MultiSubscriptionBase = require(rootPrefix + '/executables/rabbitmq/MultiSubscriptionBase'),
  FetchPendingTxData = require(rootPrefix + '/lib/transactions/FetchPendingTransactionsByHash'),
  BlockParserPendingTaskModel = require(rootPrefix + '/app/models/mysql/BlockParserPendingTask'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  web3InteractFactory = require(rootPrefix + '/lib/providers/web3'),
  rabbitmqConstants = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  transactionMetaConst = require(rootPrefix + '/lib/globalConstant/transactionMeta'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction');

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

class TransactionParser extends MultiSubscriptionBase {
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

  /**
   * Cron kind
   *
   * @return {string}
   * @private
   */
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
    const oThis = this;

    await oThis._fetchConfigStrategy();

    // Get blockScanner object.
    let blockScanner = await blockScannerProvider.getInstance([oThis.chainId]);

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

    let rabbitParams = {
      topic: oThis._topicsToSubscribe[0],
      queue: oThis._queueName,
      prefetchCount: oThis.prefetchCount
    };

    if (oThis.isOriginChain) {
      rabbitParams['rabbitmqKind'] = rabbitmqConstants.originRabbitmqKind;
    } else {
      rabbitParams['auxChainId'] = oThis.chainId;
      rabbitParams['rabbitmqKind'] = rabbitmqConstants.auxRabbitmqKind;
    }

    oThis.subscriptionTopicToDataMap[oThis._topicsToSubscribe[0]] = new RabbitmqSubscription(rabbitParams);
  }

  /**
   * This method calls the transaction parser and token transfer parser services as needed.
   *
   * @param {String} messageParams
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
    let blockParserTaskModel = new BlockParserPendingTaskModel(),
      blockParserTasks = await blockParserTaskModel.fetchTask(taskId);

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
      return;
    }

    // Fetch block number and transaction hashes from query response
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

      await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);
      logger.debug('------unAckCount -> ', oThis.unAckCount);
      // ACK RMQ.
      return;
    }

    // Create object of transaction parser.
    let transactionParser = new oThis.TransactionParser(chainId, rawBlock, transactionHashes, nodes);

    // Start transaction parser service.
    const transactionParserResponse = await transactionParser.perform();

    // If transaction parser returns error, then delete the task from table and ACK RMQ
    if (!transactionParserResponse.isSuccess()) {
      // Delete block parser pending task if transaction parser took it.
      new BlockParserPendingTaskModel().deleteTask(taskId);

      // Transaction parsing response was unsuccessful.

      logger.error(
        'e_bs_tp_4',
        'Error in transaction parsing. unAckCount ->',
        oThis.unAckCount,
        'Transaction parsing response: ',
        transactionParserResponse
      );

      // ACK RMQ.
      return;
    }

    // Fetch data from transaction parser response.
    let transactionReceiptMap = transactionParserResponse.data.transactionReceiptMap || {},
      unprocessedItems = transactionParserResponse.data.unprocessedTransactions || [],
      processedReceipts = {};

    let unprocessedItemsMap = {},
      tokenParserNeeded = false;

    for (let index = 0; index < unprocessedItems.length; index++) {
      unprocessedItemsMap[unprocessedItems[index]] = 1;
    }

    let txHashList = [];

    for (let txHash in transactionReceiptMap) {
      if (!unprocessedItemsMap[txHash] && transactionReceiptMap[txHash]) {
        txHashList.push(txHash);
        processedReceipts[txHash] = transactionReceiptMap[txHash];
        tokenParserNeeded = true;
      }
    }

    await oThis._updateStatusesInDb(txHashList, transactionReceiptMap).catch(function(error) {
      // as we have code in finalizer to check and update statuses (if needed) we ignore any errors from here and proceed
      logger.error('_updateStatusesInDb failed in transactionParser', error);
    });

    // If token transfer parsing not needed, ACK RMQ
    if (!tokenParserNeeded) {
      logger.log('Token transfer parsing not needed.');
      logger.debug('------unAckCount -> ', oThis.unAckCount);
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
    new BlockParserPendingTaskModel().deleteTask(taskId);

    if (tokenTransferParserResponse.isSuccess()) {
      // Token transfer parser was successful.
      logger.debug('------unAckCount -> ', oThis.unAckCount);
    } else {
      // If token transfer parsing failed.
      logger.error(
        'e_bs_w_3',
        'Token transfer parsing unsuccessful. unAckCount ->',
        oThis.unAckCount,
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
   * @private
   *
   * @returns {Promise<void>}
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
   *
   * @param blockScannerObj
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
   * Start subscription
   *
   * @return {Promise<void>}
   * @private
   */
  async _startSubscription() {
    const oThis = this;

    await oThis._startSubscriptionFor(oThis._topicsToSubscribe[0]);
  }

  /**
   * Increment Unack count
   *
   * @param messageParams
   * @private
   */
  _incrementUnAck(messageParams) {
    const oThis = this;

    oThis.subscriptionTopicToDataMap[oThis._topicsToSubscribe[0]].incrementUnAckCount();

    return true;
  }

  /**
   * Decrement Unack count
   *
   * @param messageParams
   * @private
   */
  _decrementUnAck(messageParams) {
    const oThis = this;

    oThis.subscriptionTopicToDataMap[oThis._topicsToSubscribe[0]].decrementUnAckCount();

    return true;
  }

  /**
   * Get Unack count.
   *
   * @param messageParams
   * @returns {number}
   * @private
   */
  _getUnAck(messageParams) {
    const oThis = this;

    return oThis.subscriptionTopicToDataMap[oThis._topicsToSubscribe[0]].unAckCount;
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
   * update statuses in pending tx and tx meta
   *
   * @param txHashes
   * @param transactionReceiptMap
   * @return {Promise<void>}
   * @private
   */
  async _updateStatusesInDb(txHashes, transactionReceiptMap) {
    const oThis = this;

    let pendingTransactionObj = new PendingTransactionCrud(oThis.chainId);
    let fetchPendingTxResp = await new FetchPendingTxData(oThis.chainId, txHashes, false).perform();
    if (fetchPendingTxResp.isFailure()) {
      return fetchPendingTxResp;
    }
    fetchPendingTxResp = fetchPendingTxResp.data;

    let promiseArray = [],
      receiptSuccessTxHashes = [],
      receiptFailureTxHashes = [],
      flushNonceCacheForSessionAddresses = [];

    // Update Pending tx
    for (let pendingTxUuid in fetchPendingTxResp) {
      let pendingTxData = fetchPendingTxResp[pendingTxUuid],
        transactionHash = pendingTxData['transactionHash'],
        transactionReceipt = transactionReceiptMap[transactionHash];

      let transactionStatus = transactionReceipt.status == '0x0' || transactionReceipt.status === false ? false : true;
      if (transactionStatus) {
        receiptSuccessTxHashes.push(transactionHash);
      } else {
        receiptFailureTxHashes.push(transactionHash);
        if (pendingTxData.sessionKeyAddress) {
          flushNonceCacheForSessionAddresses.push(pendingTxData.sessionKeyAddress);
        }
      }

      let updateParams = {
        chainId: oThis.chainId,
        transactionUuid: pendingTxData.transactionUuid,
        status:
          transactionStatus & transactionReceipt.internalStatus
            ? pendingTransactionConstants.minedStatus
            : pendingTransactionConstants.failedStatus,
        blockNumber: transactionReceipt.blockNumber,
        blockTimestamp: transactionReceipt.blockTimestamp
      };

      promiseArray.push(
        pendingTransactionObj.update(updateParams).catch(function(error) {
          // as we have code in finalizer to check and update status (if needed) we ignore any errors from here and proceed
          logger.error('_updateStatuseInDb failed in transactionParser', error);
        })
      );

      if (promiseArray.length === TX_BATCH_SIZE) {
        await Promise.all(promiseArray);
        promiseArray = [];
      }
    }

    if (promiseArray.length > 0) {
      await Promise.all(promiseArray);
    }

    // Release lock and mark tx meta status
    if (receiptSuccessTxHashes.length > 0) {
      await new TransactionMeta().releaseLockAndMarkStatus({
        status: transactionMetaConst.minedStatus,
        receiptStatus: transactionMetaConst.successReceiptStatus,
        transactionHashes: receiptSuccessTxHashes,
        chainId: oThis.chainId
      });
    }

    if (receiptFailureTxHashes.length > 0) {
      await new TransactionMeta().releaseLockAndMarkStatus({
        status: transactionMetaConst.minedStatus,
        receiptStatus: transactionMetaConst.failureReceiptStatus,
        transactionHashes: receiptFailureTxHashes,
        chainId: oThis.chainId
      });
    }

    // Flush session nonce cache
    if (flushNonceCacheForSessionAddresses.length > 0) {
      await oThis._flushNonceCacheForSessionAddresses(flushNonceCacheForSessionAddresses);
    }
  }

  /**
   *
   * @param addresses
   * @private
   */
  async _flushNonceCacheForSessionAddresses(addresses) {
    const oThis = this;

    let promises = [];

    if (!oThis.chainId) {
      console.error('_flushNonceCacheForSessionAddresses chainIdNotFound TransactionParser');
      return;
    }

    for (let i = 0; i < addresses.length; i++) {
      promises.push(
        new NonceForSession({
          address: addresses[i],
          chainId: oThis.chainId
        }).clear()
      );
    }

    await Promise.all(promises);
  }
}

logger.step('Transaction parser process started.');

new TransactionParser({ cronProcessId: +program.cronProcessId }).perform();

setInterval(function() {
  logger.info('Ending the process. Sending SIGINT.');
  process.emit('SIGINT');
}, cronProcessesConstants.transactionParserRestartInterval);
