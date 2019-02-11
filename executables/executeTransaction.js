'use strict';
/**
 * Factory class for workflowRouter.
 *
 * @module executables/workflowRouter/factory
 */
const program = require('commander');

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ChainSubscriberBase = require(rootPrefix + '/executables/rabbitmq/ChainSubscriberBase'),
  workflowTopicConstant = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  kwcConstant = require(rootPrefix + '/lib/globalConstant/kwc'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/workflowRouter/factory.js --cronProcessId 3');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

let cronProcessId = +program.cronProcessId;

/**
 * Class for workflow router factory.
 *
 * @class
 */
class WorkflowRouterFactory extends ChainSubscriberBase {
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
    await oThis.init();

    oThis._prepareData();

    await oThis._startSubscription(oThis._messageTopicToSubscribe);
    await oThis._startSubscription(oThis._cqTopicToSubscribe);

    return true;
  }

  /**
   * Query and collect extx workers process data.
   * @returns {Promise}
   * @private
   */
  async init() {
    const oThis = this,
      initProcessResp = await new initProcess({ processId: cronProcessId }).perform();

    return true;
  }

  _prepareData() {
    const oThis = this;
    oThis.subscriptionData[oThis._messageTopicToSubscribe] = {
      topicName: oThis._messageTopicToSubscribe,
      queueName: oThis._messageQueueName,
      prefetchCount: oThis.prefetchCount,
      subscribed: 0
    };
    oThis.subscriptionData[oThis._cqTopicToSubscribe] = {
      topicName: oThis._cqTopicToSubscribe,
      queueName: oThis._commandQueueName,
      prefetchCount: 1,
      subscribed: 0
    };
  }

  /**
   * Topics to subscribe
   *
   * @returns {*[]}
   *
   * @private
   */
  get _messageTopicToSubscribe() {
    return 'execute_transaction_topic.' + 'chainId' + 'topicQueueSuffix';
  }

  /**
   * Queue name
   *
   * @returns {String}
   *
   * @private
   */
  get _messageQueueName() {
    return 'workflow';
  }

  /**
   * Topics to subscribe
   *
   * @returns {*[]}
   *
   * @private
   */
  get _cqTopicToSubscribe() {
    return 'ex_tx_command_message_topic.' + 'chainId' + 'topicQueueSuffix';
  }

  /**
   * Queue name
   *
   * @returns {String}
   *
   * @private
   */
  get _commandQueueName() {
    return 'workflow';
  }

  /**
   * Process name prefix
   *
   * @returns {String}
   *
   * @private
   */
  get _processNamePrefix() {
    return 'workflow_processor';
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
    return cronProcessesConstants.workflowWorker;
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
      await oThis.commandResponseActions(commandProcessorResponse);
    }
    return true;
  }

  async commandResponseActions(commandProcessorResponse) {
    const oThis = this;

    if (
      commandProcessorResponse.data.shouldStartTxQueConsume &&
      commandProcessorResponse.data.shouldStartTxQueConsume === 1
    ) {
      await oThis._startSubscription(oThis._messageTopicToSubscribe);
    } else if (
      commandProcessorResponse.data.shouldStopTxQueConsume &&
      commandProcessorResponse.data.shouldStopTxQueConsume === 1
    ) {
      process.emit('CANCEL_CONSUME', intentToConsumerTagMap.exTxQueue);
      oThis.subscriptionData[oThis._messageTopicToSubscribe]['subscribed'] = 0;
    }
    return true;
  }
}

new WorkflowRouterFactory({ cronProcessId: +program.cronProcessId }).perform();

setInterval(function() {
  logger.info('Ending the process. Sending SIGINT.');
  process.emit('SIGINT');
}, 45 * 60 * 1000);
