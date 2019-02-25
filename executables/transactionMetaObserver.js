'use strict';
/**
 * This script will update price oracle price points using ost-price-oracle npm package.
 * This fetches OST Current price in given currency from coin market cap and sets it in price oracle.
 *
 * Usage: node executables/UpdatePricePoints.js --cronProcessId 13
 *
 * @module executables/UpdatePricePoints
 *
 * This cron expects auxChainId and quoteCurrency in cron params. quoteCurrency is an optional parameter.
 */

const program = require('commander');

const rootPrefix = '..',
  CronBase = require(rootPrefix + '/executables/CronBase'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  QueuedHandlerKlass = require(rootPrefix + '/lib/transactionErrorHandlers/queuedHandler'),
  GethDownHandlerKlass = require(rootPrefix + '/lib/transactionErrorHandlers/gethDownHandler'),
  SubmittedHandlerKlass = require(rootPrefix + '/lib/transactionErrorHandlers/submittedHandler'),
  TransactionMetaModel = require(rootPrefix + '/app/models/mysql/TransactionMeta'),
  transactionMetaConst = require(rootPrefix + '/lib/globalConstant/transactionMeta');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/UpdatePricePoints.js --cronProcessId 13');
  logger.log('');
  logger.log('');
});

const cronProcessId = +program.cronProcessId;

if (cronProcessId) {
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
  }

  /**
   * Cron kind
   *
   * @return {String}
   *
   * @private
   */
  get _cronKind() {
    return cronProcessesConstants.transactionMetaObserver;
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
          internal_error_identifier: 'e_upp_1',
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

    oThis.initializeVars();

    await oThis.acquireLock();

    await oThis.getTransactionsToProcess();

    await oThis._processPendingTransactions();

    logger.step('**Releasing lock.');
    oThis.releaseLock();

    logger.step('**Cron completed.');
  }

  initializeVars() {
    const oThis = this;

    let currentTimeMs = new Date().getTime();

    oThis.statusesToObserve = [];
    oThis.noOfRowsToProcess = oThis.noOfRowsToProcess || 100;
    oThis.currentTime = Math.floor(currentTimeMs / 1000);
    oThis.lockId = parseFloat(currentTimeMs + '.' + cronProcessId);
  }

  async acquireLock() {
    const oThis = this;

    await new TransactionMetaModel()
      .update(['lock_id=?', oThis.lockId])
      .where([
        'status IN (?) AND next_action_at < ? AND retry_count < 10 AND lock_id IS NULL',
        oThis.statusesToObserve,
        oThis.currentTime
      ])
      .limit(oThis.noOfRowsToProcess)
      .fire();

    oThis.lockAcquired = true;

    return true;
  }

  async getTransactionsToProcess() {
    const oThis = this;

    oThis.transactionsToProcess = [];

    oThis.transactionsToProcess = await new TransactionMetaModel()
      .select('*')
      .where(['lock_id = ?', oThis.lockId])
      .fire();

    return true;
  }

  async _processPendingTransactions() {
    const oThis = this;

    let transactionsGroup = {};
    for (let i = 0; i < oThis.transactionsToProcess.length; i++) {
      let txMeta = oThis.transactionsToProcess[i];

      transactionsGroup[txMeta.status] = transactionsGroup[txMeta.status] || [];
      transactionsGroup[txMeta.status].push(txMeta);
    }

    for (let txStatus in transactionsGroup) {
      let transactionDetails = transactionsGroup[txStatus];
      if (transactionDetails && transactionDetails.length > 0) {
        if (txStatus == transactionMetaConst.queuedStatus) {
          oThis.handlerPromises.push(new QueuedHandlerKlass().perform());
        } else {
        }
      }
    }
    await Promise.all(oThis.handlerPromises);
    oThis.handlerPromises = [];
    return Promise.resolve(oThis.handlerPromises);
  }

  /**
   * Release lock acquired from rows.
   *
   * @return {Promise<Result>}
   */
  async releaseLock() {
    const oThis = this;

    await new TransactionMetaModel()
      .update(['lock_id = NULL'])
      .where(['lock_id = ?'])
      .fire();
  }

  /**
   * Pending tasks done
   *
   * @return {Boolean}
   *
   * @private
   */
  _pendingTasksDone() {
    const oThis = this;

    return oThis.handlerPromises.length === 0 && !oThis.lockAcquired;
  }
}

// Perform action
new TransactionMetaObserver({ cronProcessId: cronProcessId }).perform().catch(function() {
  process.emit('SIGINT');
});

setInterval(function() {
  logger.info('Ending the process. Sending SIGINT.');
  process.emit('SIGINT');
}, 30 * 60 * 1000);
