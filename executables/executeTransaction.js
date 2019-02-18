'use strict';
/**
 * Factory class for workflowRouter.
 *
 * @module executables/workflowRouter/factory
 */
const program = require('commander'),
  OSTBase = require('@openstfoundation/openst-base');

const rootPrefix = '..',
  InstanceComposer = OSTBase.InstanceComposer,
  kwcConstant = require(rootPrefix + '/lib/globalConstant/kwc'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  MultiSubsciptionBase = require(rootPrefix + '/executables/rabbitmq/MultiSubsciptionBase'),
  InitProcessKlass = require(rootPrefix + '/lib/executeTransactionManagement/InitProcess'),
  SequentialManagerKlass = require(rootPrefix + '/lib/nonce/SequentialManager'),
  CommandMessageProcessor = require(rootPrefix + '/lib/executeTransactionManagement/CommandMessageProcessor'),
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

require(rootPrefix + '/lib/transactions/ProcessRmqMessage');

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
 * Class for Execute Transaction Process.
 *
 * @class
 */
class ExecuteTransactionProcess extends MultiSubsciptionBase {
  /**
   * Constructor for Execute Transaction Process.
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
    oThis.subscriptionTopicToDataMap = {};
    oThis.initProcessResp = {};
    oThis.exTxTopicName = null;
    oThis.cMsgTopicName = null;
    oThis.auxChainId = null;
    oThis.ic = null;
  }

  /**
   * Before subscribe
   *
   * @return {Promise<void>}
   * @private
   */
  async _beforeSubscribe() {
    const oThis = this;

    // Query to get queue_topic suffix & chainId
    oThis.initProcessResp = await new InitProcessKlass({ processId: cronProcessId }).perform();

    const strategyByChainHelperObj = new StrategyByChainHelper(oThis.auxChainId),
      configStrategyResp = await strategyByChainHelperObj.getComplete();

    if (configStrategyResp.isFailure()) {
      logger.error('Could not fetch configStrategy. Exiting the process.');
      process.emit('SIGINT');
    }

    const configStrategy = configStrategyResp.data;

    oThis.ic = new InstanceComposer(configStrategy);
  }

  /**
   * Start subscription
   *
   * @return {Promise<void>}
   * @private
   */
  async _startSubscription() {
    const oThis = this;

    if (oThis.initProcessResp.shouldStartTxQueConsume == 1) {
      await oThis._startSubscriptionFor(oThis.exTxTopicName);
    }
    await oThis._startSubscriptionFor(oThis.cMsgTopicName);
  }

  /**
   * Prepare subscription data.
   *
   * @returns {{}}
   * @private
   */
  _prepareSubscriptionData() {
    const oThis = this,
      queueTopicSuffix = oThis.initProcessResp.processDetails.queueTopicSuffix;

    oThis.auxChainId = oThis.initProcessResp.processDetails.chainId;
    oThis.exTxTopicName = kwcConstant.exTxTopicName(oThis.auxChainId, queueTopicSuffix);
    oThis.cMsgTopicName = kwcConstant.commandMessageTopicName(oThis.auxChainId, queueTopicSuffix);

    let exTxQueueName = kwcConstant.exTxQueueName(oThis.auxChainId, queueTopicSuffix),
      cMsgQueueName = kwcConstant.commandMessageQueueName(oThis.auxChainId, queueTopicSuffix);

    oThis.subscriptionTopicToDataMap[oThis.exTxTopicName] = {
      topicName: oThis.exTxTopicName,
      queueName: exTxQueueName,
      promiseQueueManager: null,
      unAckCount: 0,
      prefetchCount: oThis.prefetchCount,
      subscribed: 0
    };
    oThis.subscriptionTopicToDataMap[oThis.cMsgTopicName] = {
      topicName: oThis.cMsgTopicName,
      queueName: cMsgQueueName,
      promiseQueueManager: null,
      unAckCount: 0,
      prefetchCount: 1,
      subscribed: 0
    };

    return oThis.subscriptionTopicToDataMap;
  }

  /**
   *
   * @private
   */
  async _sequentialExecutor(messageParams) {
    const oThis = this;
    let msgParams = messageParams.message.payload,
      kind = messageParams.message.kind;

    if (kind == kwcConstant.executeTx) {
      return new SequentialManagerKlass(oThis.auxChainId, msgParams.tokenAddressId)
        .queueAndFetchNonce()
        .catch(function(err) {
          console.log('---------err---', err);
        });
    } else {
      return Promise.resolve(responseHelper.successWithData({}));
    }
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

  /**
   * Increment Unack count.
   *
   * @param messageParams
   * @returns {boolean}
   * @private
   */
  _incrementUnAck(messageParams) {
    const oThis = this;

    let msgParams = messageParams.message.payload,
      kind = msgParams.kind;

    if (kind == kwcConstant.executeTx) {
      oThis.subscriptionTopicToDataMap[oThis.exTxTopicName].unAckCount++;
    } else if (kind == kwcConstant.commandMsg) {
      oThis.subscriptionTopicToDataMap[oThis.cMsgTopicName].unAckCount++;
    }
    return true;
  }

  /**
   * Decrement Unack count.
   *
   * @param messageParams
   * @returns {boolean}
   * @private
   */
  _decrementUnAck(messageParams) {
    const oThis = this;

    let msgParams = messageParams.message.payload,
      kind = msgParams.kind;

    if (kind == kwcConstant.executeTx) {
      oThis.subscriptionTopicToDataMap[oThis.exTxTopicName].unAckCount--;
    } else if (kind == kwcConstant.commandMsg) {
      oThis.subscriptionTopicToDataMap[oThis.cMsgTopicName].unAckCount--;
    }
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

    let msgParams = messageParams.message.payload,
      kind = msgParams.kind;

    if (kind == kwcConstant.executeTx) {
      return oThis.subscriptionTopicToDataMap[oThis.exTxTopicName].unAckCount;
    } else if (kind == kwcConstant.commandMsg) {
      return oThis.subscriptionTopicToDataMap[oThis.cMsgTopicName].unAckCount;
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

    // Identify which file/function to initiate to execute task of specific kind.

    let msgParams = messageParams.message.payload,
      kind = messageParams.message.kind;

    logger.log('_processMessage-------------------------.......\n', messageParams);

    if (kind == kwcConstant.executeTx) {
      logger.info('Message specific perform called called called called called called called.......\n');
      //message specific perform called.

      const payload = messageParams.message.payload;

      let ProcessRmqExecuteTxMessage = oThis.ic.getShadowedClassFor(
          coreConstants.icNameSpace,
          'ProcessRmqExecuteTxMessage'
        ),
        processRmqExecuteTxMessage = new ProcessRmqExecuteTxMessage({
          tokenAddressId: payload.tokenAddressId,
          transactionUuid: payload.transaction_uuid,
          sequentialExecutorResponse: payload.sequentialExecutorResponse
        });

      // Start transaction parser service.
      const processMsgRsp = await processRmqExecuteTxMessage.perform();

      if (processMsgRsp.isSuccess()) {
        logger.debug('------unAckCount -> ', oThis.unAckCount);
        // ACK RMQ.
        return;
      } else {
        logger.error(
          'e_et_1',
          'Error in processRmqExecuteTxMessage. unAckCount ->',
          oThis.unAckCount,
          'processRmqExecuteTxMessage response: ',
          processMsgRsp
        );
        // ACK RMQ.
        return;
      }
    } else if (kind == kwcConstant.commandMsg) {
      logger.info('Command specific perform called called called called called called called called.......\n');
      let commandMessageParams = {
        auxChainId: oThis.auxChainId,
        commandMessage: msgParams
      };
      let commandProcessorResponse = await new CommandMessageProcessor(commandMessageParams).perform();
      await oThis._commandResponseActions(commandProcessorResponse);
    }
    return true;
  }

  /**
   * Actions to take on command messages.
   *
   * @param commandProcessorResponse
   * @returns {Promise<boolean>}
   * @private
   */
  async _commandResponseActions(commandProcessorResponse) {
    const oThis = this;

    if (
      commandProcessorResponse &&
      commandProcessorResponse.data.shouldStartTxQueConsume &&
      commandProcessorResponse.data.shouldStartTxQueConsume === 1
    ) {
      await oThis._startSubscriptionFor(oThis.exTxTopicName);
    } else if (
      commandProcessorResponse &&
      commandProcessorResponse.data.shouldStopTxQueConsume &&
      commandProcessorResponse.data.shouldStopTxQueConsume === 1
    ) {
      oThis._stopPickingUpNewTasks(oThis.exTxTopicName);
    }
    return true;
  }
}

new ExecuteTransactionProcess({ cronProcessId: +program.cronProcessId }).perform();
