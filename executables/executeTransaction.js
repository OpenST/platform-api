'use strict';
/**
 * Factory class for workflowRouter.
 *
 * @module executables/workflowRouter/factory
 */
const program = require('commander');

const rootPrefix = '..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ChainSubscriberBase = require(rootPrefix + '/executables/rabbitmq/ChainSubscriberBase'),
  InitProcessKlass = require(rootPrefix + '/lib/executeTransactionManagement/initProcess'),
  kwcConstant = require(rootPrefix + '/lib/globalConstant/kwc'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/executeTransaction.js --cronProcessId 15');
  logger.log('');
  logger.log('');
});

let cronProcessId = +program.cronProcessId;
if (!cronProcessId) {
  program.help();
  process.exit(1);
}

/**
 * Class for workflow router factory.
 *
 * @class
 */
class ExecuteTransactionProcess extends ChainSubscriberBase {
  /**
   * Constructor for workflow router factory.
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

    const oThis = this;
    oThis.subscriptionData = {};
    oThis.initProcessResp = {};
    oThis.exTxTopicName = null;
    oThis.cMsgTopicName = null;
  }

  /**
   * Start the actual functionality of the cron.
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _start() {
    const oThis = this;

    // Query to get queue_topic suffix & chainId
    oThis.initProcessResp = await new InitProcessKlass({ processId: cronProcessId }).perform();

    oThis._prepareData();

    if (oThis.initProcessResp.shouldStartTxQueConsume == 1) {
      await oThis._startSubscription(oThis.exTxTopicName);
    }
    await oThis._startSubscription(oThis.cMsgTopicName);

    return true;
  }

  _prepareData() {
    const oThis = this,
      chainId = oThis.initProcessResp.processDetails.chainId,
      queueTopicSuffix = oThis.initProcessResp.processDetails.queueTopicSuffix;

    oThis.exTxTopicName = kwcConstant.exTxTopicName(chainId, queueTopicSuffix);
    oThis.cMsgTopicName = kwcConstant.commandMessageTopicName(chainId, queueTopicSuffix);

    let exTxQueueName = kwcConstant.exTxQueueName(chainId, queueTopicSuffix),
      cMsgQueueName = kwcConstant.commandMessageQueueName(chainId, queueTopicSuffix);

    oThis.subscriptionData[oThis.exTxTopicName] = {
      topicName: oThis.exTxTopicName,
      queueName: exTxQueueName,
      promiseQueueManager: null,
      unAckCount: 0,
      prefetchCount: oThis.prefetchCount,
      subscribed: 0
    };
    oThis.subscriptionData[oThis.cMsgTopicName] = {
      topicName: oThis.cMsgTopicName,
      queueName: cMsgQueueName,
      promiseQueueManager: null,
      unAckCount: 0,
      prefetchCount: 1,
      subscribed: 0
    };

    return oThis.subscriptionData;
  }

  /**
   * Process name prefix
   *
   * @returns {String}
   *
   * @private
   */
  get _processNamePrefix() {
    return 'execute_transaction_processor';
  }

  /**
   * Specific validations
   *
   * @returns {Boolean}
   *
   * @private
   */
  _specificValidations() {
    // Add specific validations here
    return true;
  }

  /**
   * Cron kind
   *
   * @returns {String}
   *
   * @private
   */
  get _cronKind() {
    return cronProcessesConstants.executeTransaction;
  }

  _incrementUnAck(messageParams) {
    const oThis = this;

    let msgParams = messageParams.message.payload,
      kind = msgParams.kind;

    if (kind == kwcConstant.executeTx) {
      oThis.subscriptionData[oThis.exTxTopicName].unAckCount++;
    } else if (kind == kwcConstant.commandMsg) {
      oThis.subscriptionData[oThis.cMsgTopicName].unAckCount++;
    }
    return true;
  }

  _decrementUnAck(messageParams) {
    const oThis = this;

    let msgParams = messageParams.message.payload,
      kind = msgParams.kind;

    if (kind == kwcConstant.executeTx) {
      oThis.subscriptionData[oThis.exTxTopicName].unAckCount--;
    } else if (kind == kwcConstant.commandMsg) {
      oThis.subscriptionData[oThis.cMsgTopicName].unAckCount--;
    }
    return true;
  }

  _getUnAck(messageParams) {
    const oThis = this;

    let msgParams = messageParams.message.payload,
      kind = msgParams.kind;

    if (kind == kwcConstant.executeTx) {
      return oThis.subscriptionData[oThis.exTxTopicName].unAckCount;
    } else if (kind == kwcConstant.commandMsg) {
      return oThis.subscriptionData[oThis.cMsgTopicName].unAckCount;
    }
    return 0;
  }

  /**
   * Process message
   *
   * @param {Object} messageParams
   * @param {String} messageParams.kind: whether it is command message or ex tx message.
   * @param {Object} messageParams.message
   * @param {Object} messageParams.message.payload
   *
   * @returns {Promise<>}
   *
   * @private
   */
  async _processMessage(messageParams) {
    const oThis = this;

    // identify which file/function to initiate to execute task of specific kind.
    // Query in workflow_steps to get details pf parent id in message params
    let msgParams = messageParams.message.payload,
      kind = msgParams.kind;

    if (kind == kwcConstant.executeTx) {
      console.log('message specific perform called.......\n', messageParams);
      //message specific perform called.
    } else if (kind == kwcConstant.commandMsg) {
      console.log('Command specific perform called.......\n', messageParams);
      let commandProcessorResponse = null;
      await oThis._commandResponseActions(commandProcessorResponse);
    }
    return true;
  }

  async _commandResponseActions(commandProcessorResponse) {
    const oThis = this;

    if (
      commandProcessorResponse &&
      commandProcessorResponse.data.shouldStartTxQueConsume &&
      commandProcessorResponse.data.shouldStartTxQueConsume === 1
    ) {
      await oThis._startSubscription(oThis.exTxTopicName);
    } else if (
      commandProcessorResponse &&
      commandProcessorResponse.data.shouldStopTxQueConsume &&
      commandProcessorResponse.data.shouldStopTxQueConsume === 1
    ) {
      oThis.stopPickingUpNewTasks(oThis.exTxTopicName);
    }
    return true;
  }
}

new ExecuteTransactionProcess({ cronProcessId: +program.cronProcessId }).perform();
