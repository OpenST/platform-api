'use strict';
/**
 * Class to track latest transaction
 *
 * @module executables/auxWorkflowFactory
 */
const program = require('commander');

const rootPrefix = '..',
  LatestTransaction = require(rootPrefix + '/app/models/mysql/LatestTransaction'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  workflowTopicConstant = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  rabbitmqConstants = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  RabbitmqSubscription = require(rootPrefix + '/lib/entity/RabbitSubscription'),
  MultiSubscriptionBase = require(rootPrefix + '/executables/rabbitmq/MultiSubscriptionBase');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/trackLatestTransaction.js --cronProcessId 34');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

/**
 * Class for track latest transaction.
 *
 * @class
 */
class TrackLatestTransaction extends MultiSubscriptionBase {
  /**
   * Constructor for track latest transaction.
   *
   * @augments SubscriberBase
   *
   * @param {Object} params: params object
   * @param {Number} params.cronProcessId: cron_processes table id
   *
   * @constructor
   */
  constructor(params) {
    super(params);
  }

  /**
   * Process name prefix
   *
   * @returns {String}
   *
   * @private
   */
  get _processNamePrefix() {
    return 'aux_track_latest_transaction';
  }

  /**
   * Topics to subscribe
   *
   * @returns {*[]}
   *
   * @private
   */
  get _topicsToSubscribe() {
    return ['latest_transaction'];
  }

  /**
   * Queue name
   *
   * @returns {String}
   *
   * @private
   */
  get _queueName() {
    return 'latest_transaction';
  }

  /**
   * Specific validations
   *
   * @return {Promise<void>}
   * @private
   */
  async _specificValidations() {
    // Add specific validations here
  }

  /**
   * Cron kind
   *
   * @returns {String}
   *
   * @private
   */
  get _cronKind() {
    return cronProcessesConstants.trackLatestTransaction;
  }

  /**
   * Steps to do before subscribe
   *
   * @return {Promise<boolean>}
   * @private
   */
  async _beforeSubscribe() {
    return true;
  }

  /**
   * Prepare subscription data.
   *
   * @returns {{}}
   * @private
   */

  _prepareSubscriptionData() {
    const oThis = this;

    oThis.subscriptionTopicToDataMap[oThis._topicsToSubscribe[0]] = new RabbitmqSubscription({
      rabbitmqKind: rabbitmqConstants.globalRabbitmqKind,
      topic: oThis._topicsToSubscribe[0],
      queue: oThis._queueName,
      prefetchCount: oThis.prefetchCount
    });
  }

  /**
   * Process message
   *
   * @param {Object} messageParams
   * @param {Object} messageParams.message
   * @param {Array} messageParams.topics
   * @param {String} messageParams.message.stepKind: Which step to execute in router
   * @param {Number} messageParams.message.currentStepId: id of process parent
   * @param {Number} messageParams.message.parentStepId: id of process parent
   * @param {String} messageParams.message.status
   * @param {Object} messageParams.message.payload
   *
   * @returns {Promise<>}
   *
   * @private
   */
  async _processMessage(messageParams) {
    const oThis = this;

    let txHashToLatestTxMap = JSON.parse(messageParams.message.payload);

    console.log('--txHashToLatestTxMap----', txHashToLatestTxMap);

    await oThis._insertTransactions(txHashToLatestTxMap);

    await oThis._deleteOldTransactions();
  }

  /**
   * Inserts transaction in table.
   *
   * @param txHashToLatestTxMap
   * @returns {Promise<void>}
   * @private
   */
  async _insertTransactions(txHashToLatestTxMap) {
    const oThis = this;

    let columnNamesArray = [
        'transaction_hash',
        'chain_id',
        'token_id',
        'tx_fees_in_wei',
        'token_amount_in_wei',
        'created_ts'
      ],
      rowsDataArray = [];

    for (let transactionHash in txHashToLatestTxMap) {
      let transactionFees = oThis._calculateTransactionFees(
          txHashToLatestTxMap[transactionHash].gasUsed,
          txHashToLatestTxMap[transactionHash].gasPrice
        ),
        rowData = [];

      rowData[0] = transactionHash;
      rowData[1] = txHashToLatestTxMap[transactionHash].chainId;
      rowData[2] = txHashToLatestTxMap[transactionHash].tokenId;
      rowData[3] = transactionFees;
      rowData[4] = txHashToLatestTxMap[transactionHash].amount;
      rowData[5] = txHashToLatestTxMap[transactionHash].blockTimestamp;

      rowsDataArray.push(rowData);
    }

    await new LatestTransaction().insertMultiple(columnNamesArray, rowsDataArray).fire();
  }

  /**
   * Delete old transactions
   *
   * @return {Promise<void>}
   * @private
   */
  async _deleteOldTransactions() {
    const oThis = this;

    let latestTxIds = [],
      rsp = await new LatestTransaction()
        .select(['id'])
        .order_by('created_at DESC')
        .limit(50)
        .fire();

    for (let i = 0; i < rsp.length; i++) {
      latestTxIds.push(rsp[i].id);
    }

    let queryRsp = await new LatestTransaction()
      .delete()
      .where(['id NOT IN (?)', latestTxIds])
      .fire();

    LatestTransaction.flushCache();
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
   * Calculates transaction fees.
   *
   * @param gasUsed
   * @param gasPrice
   * @returns {string}
   * @private
   */
  _calculateTransactionFees(gasUsed, gasPrice) {
    const oThis = this;

    let gasPriceBN = basicHelper.convertToBigNumber(gasPrice),
      gasUsedBN = basicHelper.convertToBigNumber(gasUsed),
      transactionFeesBN = gasPriceBN.mul(gasUsedBN);

    return transactionFeesBN.toString(10);
  }
}

logger.step('Track latest transaction cron started.');

new TrackLatestTransaction({ cronProcessId: +program.cronProcessId }).perform();

setInterval(function() {
  logger.info('Ending the process. Sending SIGINT.');
  process.emit('SIGINT');
}, cronProcessesConstants.continuousCronRestartInterval);
