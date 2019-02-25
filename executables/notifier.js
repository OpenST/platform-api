'use strict';
/**
 * Factory class for workflowRouter.
 *
 * @module executables/notifier
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
  logger.log('    node executables/notifier.js --cronProcessId 3');
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
class EmailNotifier extends SubscriberBase {
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
    return [workflowTopicConstant.emailNotifierTopic];
  }

  /**
   * Queue name
   *
   * @returns {String}
   *
   * @private
   */
  get _queueName() {
    return 'email_notifier';
  }

  /**
   * Process name prefix
   *
   * @returns {String}
   *
   * @private
   */
  get _processNamePrefix() {
    return 'email_notifier';
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
    return cronProcessesConstants.emailNotifier;
  }

  /**
   * Process message
   *
   * @param {Object} messageParams
   * @param {String} messageParams.stepKind: Which step to execute in router
   * @param {Number} messageParams.currentStepId: id of process parent
   * @param {Number} messageParams.parentStepId: id of process parent
   * @param {String} messageParams.status
   * @param {Object} messageParams.payload
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
  }
}

logger.step('Workflow Router Factory started.');

new EmailNotifier({ cronProcessId: +program.cronProcessId }).perform();

setInterval(function() {
  logger.info('Ending the process. Sending SIGINT.');
  process.emit('SIGINT');
}, 45 * 60 * 1000);
