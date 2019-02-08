'use strict';
/**
 * Factory class for workflowRouter.
 *
 * @module executables/workflowRouter/factory
 */
const program = require('commander');

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  SubscriberBase = require(rootPrefix + '/executables/rabbitmq/SubscriberBase'),
  workflowTopicConstant = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/auxWorkflowRouter/factory.js --cronProcessId 18');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

/**
 * Class for workflow router factory.
 *
 * @class
 */
class AuxWorkflowRouterFactory extends SubscriberBase {
  /**
   * Constructor for aux workflow router factory.
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

  async _beforeSubscribe() {
    return true;
  }

  /**
   * Topics to subscribe
   *
   * @returns {*[]}
   *
   * @private
   */
  get _topicsToSubscribe() {
    return ['auxWorkflow.#'];
  }

  /**
   * Queue name
   *
   * @returns {String}
   *
   * @private
   */
  get _queueName() {
    return 'auxWorkflow';
  }

  /**
   * Process name prefix
   *
   * @returns {String}
   *
   * @private
   */
  get _processNamePrefix() {
    return 'aux_workflow_processor';
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
    return cronProcessesConstants.auxWorkflowWorker;
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

    // Identify which file/function to initiate to execute task of specific kind.
    // Query in workflow_steps to get details pf parent id in message params
    let msgParams = messageParams.message.payload;
    msgParams.topic = messageParams.topics[0];

    switch (msgParams.topic) {
      case workflowTopicConstant.createTokenHolder:
        const CreateTokenHolderRouter = require(rootPrefix + '/executables/auxWorkflowRouter/CreateTokenHolderRouter');
        return new CreateTokenHolderRouter(msgParams).perform();

      default:
        throw 'Unsupported workflow topic ' + messageParams.topics[0];
    }
  }
}

logger.step('Aux Workflow Router Factory started.');

new AuxWorkflowRouterFactory({ cronProcessId: +program.cronProcessId }).perform();

setInterval(function() {
  logger.info('Ending the process. Sending SIGINT.');
  process.emit('SIGINT');
}, 45 * 60 * 1000);
