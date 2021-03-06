/**
 * Usage: node executables/transactionMetaObserver.js --cronProcessId 41
 *
 * @module executables/transactionMetaObserver
 */

const program = require('commander');

const rootPrefix = '..',
  CronBase = require(rootPrefix + '/executables/CronBase'),
  ErrorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  TransactionMetaModel = require(rootPrefix + '/app/models/mysql/TransactionMeta'),
  QueuedHandlerKlass = require(rootPrefix + '/lib/transactions/errorHandlers/queuedHandler'),
  SubmittedHandlerKlass = require(rootPrefix + '/lib/transactions/errorHandlers/submittedHandler'),
  MarkFailAndRollbackBalanceKlass = require(rootPrefix + '/lib/transactions/errorHandlers/markFailAndRollbackBalance'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  transactionMetaConst = require(rootPrefix + '/lib/globalConstant/transactionMeta');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/transactionMetaObserver.js --cronProcessId 23');
  logger.log('');
  logger.log('');
});

const cronProcessId = +program.cronProcessId;

if (!cronProcessId) {
  program.help();
  process.exit(1);
}

/**
 * Class to update price oracle price points periodically.
 *
 * @class
 */
class TransactionMetaObserver extends CronBase {
  /**
   * Class to update price oracle price points periodically.
   *
   * @param {Object} params
   * @param {Number} params.cronProcessId
   *
   * @augments CronBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.statusesToObserve = [
      transactionMetaConst.invertedStatuses[transactionMetaConst.queuedStatus],
      transactionMetaConst.invertedStatuses[transactionMetaConst.submissionInProcessStatus],
      transactionMetaConst.invertedStatuses[transactionMetaConst.gethDownStatus],
      transactionMetaConst.invertedStatuses[transactionMetaConst.gethOutOfSyncStatus],
      transactionMetaConst.invertedStatuses[transactionMetaConst.rollBackBalanceStatus],
      transactionMetaConst.invertedStatuses[transactionMetaConst.unknownGethSubmissionErrorStatus],
      transactionMetaConst.invertedStatuses[transactionMetaConst.insufficientGasStatus],
      transactionMetaConst.invertedStatuses[transactionMetaConst.nonceTooLowStatus],
      transactionMetaConst.invertedStatuses[transactionMetaConst.replacementTxUnderpricedStatus],
      transactionMetaConst.invertedStatuses[transactionMetaConst.submittedToGethStatus]
    ];
    oThis.noOfRowsToProcess = oThis.noOfRowsToProcess || 5;
    oThis.maxRetry = oThis.maxRetry || 10;
    oThis.canExit = true;

    oThis.lockId = null;
    oThis.currentTime = null;
    oThis.transactionsToProcess = null;
  }

  /**
   * Cron kind
   *
   * @return {String}
   *
   * @private
   */
  get _cronKind() {
    return cronProcessesConstants.transactionErrorHandler;
  }

  /**
   * Validate and sanitize
   *
   * @return {Promise<never>}
   *
   * @private
   */
  async _validateAndSanitize() {
    const oThis = this;

    if (!oThis.auxChainId) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_tmo_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { auxChainId: oThis.auxChainId }
        })
      );
    }
  }

  /**
   * Start the cron.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _start() {
    const oThis = this;

    while (!oThis.stopPickingUpNewWork) {
      oThis.canExit = false;

      oThis._initializeLoopVars();

      logger.step('** Acquiring lock.');
      await oThis._acquireLock();

      logger.step('** Getting transactions to process.');
      await oThis._getTransactionsToProcess();

      logger.step('** Process transactions.');
      await oThis._processPendingTransactions();

      logger.step('** Releasing lock.');
      await oThis._releaseLock();

      oThis.canExit = true;

      logger.step('** Sleeping...');
      await basicHelper.sleep(1 * 1000);
    }
  }

  /**
   * Initializing variables.
   */
  _initializeLoopVars() {
    const oThis = this;

    const currentTimeMs = new Date().getTime(),
      randomNumber = basicHelper.getRandomNumber(10000000000000, 99999999999999),
      // NOTE: as we have prefetch > 1 it is very IMPORTANT to add this random no. here
      // to avoid same lock id being used for multiple queries
      lockIdPrefix = currentTimeMs + randomNumber;

    oThis.currentTime = Math.floor(currentTimeMs / 1000);
    oThis.lockId = parseFloat(lockIdPrefix + '.' + cronProcessId);

    oThis.transactionsToProcess = [];
  }

  /**
   * Acquiring lock, so that another instance of cron doesn't pick same row.
   *
   * @returns {Promise}
   */
  _acquireLock() {
    const oThis = this;

    return new TransactionMetaModel()
      .update(['lock_id=?', oThis.lockId])
      .where([
        'status IN (?) AND next_action_at < ? AND next_action_at > 0 AND retry_count < ? AND lock_id IS NULL AND associated_aux_chain_id = (?)',
        oThis.statusesToObserve,
        oThis.currentTime,
        oThis.maxRetry,
        oThis.auxChainId
      ])
      .limit(oThis.noOfRowsToProcess)
      .fire();
  }

  /**
   * Get transactions using lock_id, to ensure locked rows to be processed here.
   *
   * @returns {Promise}
   *
   * @private
   */
  async _getTransactionsToProcess() {
    const oThis = this;

    oThis.transactionsToProcess = await new TransactionMetaModel()
      .select('*')
      .where(['lock_id = ?', oThis.lockId])
      .fire();
  }

  /**
   * Process transactions, and check whether to resubmit or mark fail or still wait.
   *
   * @returns {Promise}
   *
   * @private
   */
  async _processPendingTransactions() {
    const oThis = this;

    const promiseArray = [],
      txStatusStringMetaIdsMap = {},
      transactionsGroup = {};

    for (let index = 0; index < oThis.transactionsToProcess.length; index++) {
      const txMeta = oThis.transactionsToProcess[index];

      const txStatusString = transactionMetaConst.statuses[txMeta.status];

      transactionsGroup[txStatusString] = transactionsGroup[txStatusString] || [];
      transactionsGroup[txStatusString].push(txMeta);

      txStatusStringMetaIdsMap[txStatusString] = txStatusStringMetaIdsMap[txStatusString] || [];
      txStatusStringMetaIdsMap[txStatusString].push(txMeta.id);
    }

    for (const txStatusString in transactionsGroup) {
      const transactionsMetaRecords = transactionsGroup[txStatusString];
      const params = {
        auxChainId: oThis.auxChainId,
        lockId: oThis.lockId,
        transactionsMetaRecords: transactionsMetaRecords
      };

      if (transactionsMetaRecords && transactionsMetaRecords.length > 0) {
        if (transactionMetaConst.mapOfStatusesForRollingBackBalances[txStatusString]) {
          promiseArray.push(new MarkFailAndRollbackBalanceKlass(params).perform());
        } else if (transactionMetaConst.mapOfStatusesForResubmittingOrRollingBackBalances[txStatusString]) {
          promiseArray.push(new QueuedHandlerKlass(params).perform());
        } else if (txStatusString == transactionMetaConst.submittedToGethStatus) {
          promiseArray.push(new SubmittedHandlerKlass(params).perform());
        }
      }

      const errorObject = responseHelper.error({
        internal_error_identifier: 'transaction_meta_observer_pending_transaction:e_tmo_2:' + txStatusString,
        api_error_identifier: 'transaction_meta_observer_pending_transaction',
        debug_options: { txMetaIds: txStatusStringMetaIdsMap[txStatusString] }
      });

      await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.lowSeverity);
    }

    await Promise.all(promiseArray);
  }

  /**
   * Release lock acquired from rows.
   *
   * @return {Promise<Result>}
   */
  async _releaseLock() {
    const oThis = this;

    await new TransactionMetaModel()
      .update(['lock_id = NULL, retry_count = retry_count+1'])
      .where(['lock_id = ?', oThis.lockId])
      .fire();
  }

  /**
   * This function checks if there are any pending tasks left or not.
   *
   * @returns {Boolean}
   */
  _pendingTasksDone() {
    const oThis = this;

    return oThis.canExit;
  }
}

// Perform action
new TransactionMetaObserver({ cronProcessId: cronProcessId })
  .perform()
  .then(function() {
    logger.step('** Exiting Process');
    process.emit('SIGINT');
  })
  .catch(function(err) {
    logger.error('** Exiting Process Due to Error.', err);
    process.emit('SIGINT');
  });
