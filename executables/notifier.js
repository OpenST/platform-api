'use strict';
/**
 * Factory class for workflowRouter.
 *
 * @module executables/notifier
 */
const program = require('commander');

const rootPrefix = '..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  applicationMailerKlass = require(rootPrefix + '/lib/applicationMailer'),
  applicationMailer = new applicationMailerKlass(),
  SubscriberBase = require(rootPrefix + '/executables/rabbitmq/SubscriberBase'),
  workflowTopicConstant = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/notifier.js --cronProcessId 2');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

// Global variable defined for email aggregation
global.emailsAggregator = {};

// Declare variables.
let waitingForEmail = false;

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
   * Send Emails Aggregated by subject
   *
   * @private
   */
  sendAggregatedEmail() {
    logger.log('Sending Aggregated Emails');
    const send_for_email = JSON.parse(JSON.stringify(global.emailsAggregator));
    global.emailsAggregator = {};

    for (let subject in send_for_email) {
      let emailPayload = send_for_email[subject];
      emailPayload.body = 'Total Error Count: ' + emailPayload.count + '\n' + emailPayload.body;
      applicationMailer.perform(emailPayload);
    }
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

    logger.log('Consumed error message -> ', messageParams);

    const emailPayload = messageParams.message.payload;
    let emailSubject = emailPayload.subject;

    // aggregate same errors for a while
    if (global.emailsAggregator[emailSubject]) {
      global.emailsAggregator[emailSubject].count++;
    } else {
      global.emailsAggregator[emailSubject] = emailPayload;
      global.emailsAggregator[emailSubject].count = 1;
    }

    // Wait for 30 sec to aggregate emails with subject line
    if (!waitingForEmail) {
      waitingForEmail = true;
      setTimeout(function() {
        oThis.sendAggregatedEmail();
        waitingForEmail = false;
      }, 30000);
    }
  }

  /**
   * This function checks if there are any pending tasks left or not.
   *
   * @returns {Boolean}
   */
  _pendingTasksDone() {
    const oThis = this;

    logger.log('Check pendingTasks');
    oThis.sendAggregatedEmail();
    return !waitingForEmail;
  }
}

logger.step('Workflow Router Factory started.');

new EmailNotifier({ cronProcessId: +program.cronProcessId }).perform();

setInterval(function() {
  logger.info('Ending the process. Sending SIGINT.');
  process.emit('SIGINT');
}, 45 * 60 * 1000);
