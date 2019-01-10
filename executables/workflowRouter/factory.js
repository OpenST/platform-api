'use strict';

const program = require('commander');

const rootPrefix = '../..',
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  SubscriberBase = require(rootPrefix + '/executables/rabbitmq/SubscriberBase'),
  workflowTopicConstant = require(rootPrefix + '/lib/globalConstant/workflowTopic');

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

class workflowRouterFactory extends SubscriberBase {
  /**
   * Constructor
   *
   * @param params {object} - params object
   * @param params.cronProcessId {number} - cron_processes table id
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
    return ['workflow.#'];
  }

  /**
   * queue name
   *
   * @returns {string}
   * @private
   */
  get _queueName() {
    return 'workflow';
  }

  /**
   * process name prefix
   *
   * @returns {string}
   * @private
   */
  get _processNamePrefix() {
    return 'workflow_processor';
  }

  /**
   * specific validations
   *
   * @returns {boolean}
   * @private
   */
  _specificValidations() {
    // add specific validations here
    return true;
  }

  /**
   * cron kind
   *
   * @returns {string}
   * @private
   */
  get _cronKind() {
    return cronProcessesConstants.workflowWorker;
  }

  /**
   * Process message
   *
   * @param messageParams {Object}
   * @param messageParams.stepKind {string} Which step to execute in router
   * @param messageParams.currentStepId {number} id of process parent
   * @param messageParams.parentStepId {number} id of process parent
   * @param messageParams.status {string}
   * @param messageParams.payload {object}
   *
   * @returns {Promise<>}
   *
   * @private
   */
  async _processMessage(messageParams) {
    const oThis = this;

    // identify which file/function to initiate to execute task of specific kind.
    // Query in workflow_steps to get details pf parent id in message params
    let msgParams = messageParams.message.payload;
    msgParams.topic = messageParams.topics[0];

    switch (msgParams.topic) {
      case workflowTopicConstant.test:
        const testProcessRouter = require(rootPrefix + '/executables/workflowRouter/testProcessRouter');
        return new testProcessRouter(msgParams).perform();
      case workflowTopicConstant.stateRootSync:
        const stateRootSyncRouter = require(rootPrefix + '/executables/workflowRouter/StateRootSyncRouter');
        return new stateRootSyncRouter(msgParams).perform();
      case workflowTopicConstant.economySetup:
        const economySetupRouter = require(rootPrefix + '/executables/workflowRouter/economySetupRouter');
        return new economySetupRouter(msgParams).perform();

      default:
        throw 'Unsupported workflow topic ' + messageParams.topics[0];
    }
  }
}

logger.step('Workflow Router Factory started.');

new workflowRouterFactory({ cronProcessId: +program.cronProcessId }).perform();

setInterval(function() {
  logger.info('Ending the process. Sending SIGINT.');
  process.emit('SIGINT');
}, 45 * 60 * 1000);
