'use strict';
/**
 * Factory class for workflowRouter.
 *
 * @module executables/workflowFactory
 */
const program = require('commander');

const rootPrefix = '..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  SubscriberBase = require(rootPrefix + '/executables/rabbitmq/SubscriberBase'),
  workflowTopicConstant = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/workflowFactory.js --cronProcessId 3');
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
class WorkflowRouterFactory extends SubscriberBase {
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
    return ['workflow.#'];
  }

  /**
   * Queue name
   *
   * @returns {String}
   *
   * @private
   */
  get _queueName() {
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

    switch (msgParams.topic) {
      case workflowTopicConstant.test:
        const testProcessRouter = require(rootPrefix + '/lib/workflow/test/Router');
        return new testProcessRouter(msgParams).perform();
      case workflowTopicConstant.stateRootSync:
        const stateRootSyncRouter = require(rootPrefix + '/lib/workflow/stateRootSync/Router');
        return new stateRootSyncRouter(msgParams).perform();
      case workflowTopicConstant.economySetup:
        const EconomySetupRouter = require(rootPrefix + '/lib/workflow/economySetup/Router');
        return new EconomySetupRouter(msgParams).perform();
      case workflowTopicConstant.stPrimeStakeAndMint:
        const stPrimeRouter = require(rootPrefix + '/lib/workflow/stakeAndMint/stPrime/Router');
        return new stPrimeRouter(msgParams).perform();

      case workflowTopicConstant.btStakeAndMint:
        const BtStakeAndMintRouter = require(rootPrefix + '/lib/workflow/stakeAndMint/brandedToken/Router');
        return new BtStakeAndMintRouter(msgParams).perform();

      case workflowTopicConstant.grantEthOst:
        const GrantEthOstRouter = require(rootPrefix + '/lib/workflow/grantEthOst/Router');
        return new GrantEthOstRouter(msgParams).perform();

      default:
        throw 'Unsupported workflow topic ' + messageParams.topics[0];
    }
  }
}

logger.step('Workflow Router Factory started.');

new WorkflowRouterFactory({ cronProcessId: +program.cronProcessId }).perform();

setInterval(function() {
  logger.info('Ending the process. Sending SIGINT.');
  process.emit('SIGINT');
}, 30 * 60 * 1000);
